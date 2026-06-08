/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import Beasties from 'beasties';
import { readFile } from 'node:fs/promises';

/**
 * Pattern used to extract the media query set by Beasties in an `onload` handler.
 */
const MEDIA_SET_HANDLER_PATTERN = /^this\.media=["'](.*)["'];?$/;

/**
 * Name of the attribute used to save the Beasties media query so it can be re-assigned on load.
 */
const CSP_MEDIA_ATTR = 'ngCspMedia';

/**
 * Script that dynamically updates the `media` attribute of `<link>` tags based on a custom attribute (`CSP_MEDIA_ATTR`).
 *
 * NOTE:
 * We do not use `document.querySelectorAll('link').forEach((s) => s.addEventListener('load', ...)`
 * because load events are not always triggered reliably on Chrome.
 * See: https://github.com/angular/angular-cli/issues/26932 and https://crbug.com/1521256
 *
 * The script:
 * - Ensures the event target is a `<link>` tag with the `CSP_MEDIA_ATTR` attribute.
 * - Updates the `media` attribute with the value of `CSP_MEDIA_ATTR` and then removes the attribute.
 * - Removes the event listener when all relevant `<link>` tags have been processed.
 * - Uses event capturing (the `true` parameter) since load events do not bubble up the DOM.
 */
const LINK_LOAD_SCRIPT_CONTENT = `
(() => {
  const CSP_MEDIA_ATTR = '${CSP_MEDIA_ATTR}';
  const documentElement = document.documentElement;

  // Listener for load events on link tags.
  const listener = (e) => {
    const target = e.target;
    if (
      !target ||
      target.tagName !== 'LINK' ||
      !target.hasAttribute(CSP_MEDIA_ATTR)
    ) {
      return;
    }

    target.media = target.getAttribute(CSP_MEDIA_ATTR);
    target.removeAttribute(CSP_MEDIA_ATTR);

    if (!document.head.querySelector(\`link[\${CSP_MEDIA_ATTR}]\`)) {
      documentElement.removeEventListener('load', listener);
    }
  };

  documentElement.addEventListener('load', listener, true);
})();`;

export interface InlineCriticalCssProcessOptions {
  outputPath: string;
}

export interface InlineCriticalCssProcessorOptions {
  minify?: boolean;
  deployUrl?: string;
  readAsset?: (path: string) => Promise<string>;
  autoCsp?: boolean;
}

/** Partial representation of an `HTMLElement`. */
interface PartialHTMLElement {
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  hasAttribute(name: string): boolean;
  removeAttribute(name: string): void;
  appendChild(child: PartialHTMLElement): void;
  insertBefore(newNode: PartialHTMLElement, referenceNode?: PartialHTMLElement): void;
  remove(): void;
  name: string;
  textContent: string;
  tagName: string | null;
  children: PartialHTMLElement[];
  next: PartialHTMLElement | null;
  prev: PartialHTMLElement | null;
}

/** Partial representation of an HTML `Document`. */
interface PartialDocument {
  head: PartialHTMLElement;
  createElement(tagName: string): PartialHTMLElement;
  querySelector(selector: string): PartialHTMLElement | null;
}

/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging */

// We use Typescript declaration merging because `embedLinkedStylesheet` it's not declared in
// the `Beasties` types which means that we can't call the `super` implementation.
interface BeastiesBase {
  embedLinkedStylesheet(link: PartialHTMLElement, document: PartialDocument): Promise<unknown>;
}
class BeastiesBase extends Beasties {}
/* eslint-enable @typescript-eslint/no-unsafe-declaration-merging */

class BeastiesExtended extends BeastiesBase {
  readonly warnings: string[] = [];
  readonly errors: string[] = [];
  private addedCspScriptsDocuments = new WeakSet<PartialDocument>();
  private documentNonces = new WeakMap<PartialDocument, string | null>();

  constructor(
    private readonly optionsExtended: InlineCriticalCssProcessorOptions &
      InlineCriticalCssProcessOptions,
  ) {
    super({
      logger: {
        warn: (s: string) => this.warnings.push(s),
        error: (s: string) => this.errors.push(s),
        info: () => {},
      },
      logLevel: 'warn',
      path: optionsExtended.outputPath,
      publicPath: optionsExtended.deployUrl,
      compress: !!optionsExtended.minify,
      pruneSource: false,
      reduceInlineStyles: false,
      mergeStylesheets: false,
      // Note: if `preload` changes to anything other than `media`, the logic in
      // `embedLinkedStylesheet` will have to be updated.
      preload: 'media',
      noscriptFallback: true,
      inlineFonts: true,
    });
  }

  public override readFile(path: string): Promise<string> {
    const readAsset = this.optionsExtended.readAsset;

    return readAsset ? readAsset(path) : readFile(path, 'utf-8');
  }

  /**
   * Override of the Beasties `embedLinkedStylesheet` method
   * that makes it work with Angular's CSP APIs.
   */
  override async embedLinkedStylesheet(
    link: PartialHTMLElement,
    document: PartialDocument,
  ): Promise<unknown> {
    if (link.getAttribute('media') === 'print' && link.next?.name === 'noscript') {
      // Workaround for https://github.com/GoogleChromeLabs/critters/issues/64
      // NB: this is only needed for the webpack based builders.
      const media = link.getAttribute('onload')?.match(MEDIA_SET_HANDLER_PATTERN);
      if (media) {
        link.removeAttribute('onload');
        link.setAttribute('media', media[1]);
        link?.next?.remove();
      }
    }

    const returnValue = await super.embedLinkedStylesheet(link, document);
    const cspNonce = this.findCspNonce(document);

    if (cspNonce || this.optionsExtended.autoCsp) {
      const beastiesMedia = link.getAttribute('onload')?.match(MEDIA_SET_HANDLER_PATTERN);

      if (beastiesMedia) {
        // If there's a Beasties-generated `onload` handler and the file has an Angular CSP nonce,
        // we have to remove the handler, because it's incompatible with CSP. We save the value
        // in a different attribute and we generate a script tag with the nonce that uses
        // `addEventListener` to apply the media query instead.
        link.removeAttribute('onload');
        link.setAttribute(CSP_MEDIA_ATTR, beastiesMedia[1]);
        this.conditionallyInsertCspLoadingScript(document, cspNonce, link);
      }

      // Ideally we would hook in at the time Beasties inserts the `style` tags, but there isn't
      // a way of doing that at the moment so we fall back to doing it any time a `link` tag is
      // inserted. We mitigate it by only iterating the direct children of the `<head>` which
      // should be pretty shallow.
      if (cspNonce) {
        document.head.children.forEach((child) => {
          if (child.tagName === 'style' && !child.hasAttribute('nonce')) {
            child.setAttribute('nonce', cspNonce);
          }
        });
      }
    }

    return returnValue;
  }

  /**
   * Finds the CSP nonce for a specific document.
   */
  private findCspNonce(document: PartialDocument): string | null {
    if (this.documentNonces.has(document)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return this.documentNonces.get(document)!;
    }

    // HTML attribute are case-insensitive, but the parser used by Beasties is case-sensitive.
    const nonceElement = document.querySelector('[ngCspNonce], [ngcspnonce]');
    const cspNonce =
      nonceElement?.getAttribute('ngCspNonce') || nonceElement?.getAttribute('ngcspnonce') || null;

    this.documentNonces.set(document, cspNonce);

    return cspNonce;
  }

  /**
   * Inserts the `script` tag that swaps the critical CSS at runtime,
   * if one hasn't been inserted into the document already.
   */
  private conditionallyInsertCspLoadingScript(
    document: PartialDocument,
    nonce: string | null,
    link: PartialHTMLElement,
  ): void {
    if (this.addedCspScriptsDocuments.has(document)) {
      return;
    }

    const script = document.createElement('script');
    script.textContent = LINK_LOAD_SCRIPT_CONTENT;
    if (nonce) {
      script.setAttribute('nonce', nonce);
    }

    // Prepend the script to the head since it needs to
    // run as early as possible, before the `link` tags.
    document.head.insertBefore(script, link);
    this.addedCspScriptsDocuments.add(document);
  }
}

export class InlineCriticalCssProcessor {
  constructor(protected readonly options: InlineCriticalCssProcessorOptions) {}

  async process(
    html: string,
    options: InlineCriticalCssProcessOptions,
  ): Promise<{ content: string; warnings: string[]; errors: string[] }> {
    const beasties = new BeastiesExtended({ ...this.options, ...options });
    const content = await beasties.process(html);

    return {
      // Clean up value from value less attributes.
      // This is caused because parse5 always requires attributes to have a string value.
      // nomodule="" defer="" -> nomodule defer.
      content: content.replace(/(\s(?:defer|nomodule))=""/g, '$1'),
      errors: beasties.errors,
      warnings: beasties.warnings,
    };
  }
}
