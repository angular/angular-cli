/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import Critters from 'critters';
import { readFile } from 'node:fs/promises';

/**
 * Pattern used to extract the media query set by Critters in an `onload` handler.
 */
const MEDIA_SET_HANDLER_PATTERN = /^this\.media=["'](.*)["'];?$/;

/**
 * Name of the attribute used to save the Critters media query so it can be re-assigned on load.
 */
const CSP_MEDIA_ATTR = 'ngCspMedia';

/**
 * Script text used to change the media value of the link tags.
 *
 * NOTE:
 * We do not use `document.querySelectorAll('link').forEach((s) => s.addEventListener('load', ...)`
 * because this does not always fire on Chome.
 * See: https://github.com/angular/angular-cli/issues/26932 and https://crbug.com/1521256
 */
const LINK_LOAD_SCRIPT_CONTENT = [
  '(() => {',
  `  const CSP_MEDIA_ATTR = '${CSP_MEDIA_ATTR}';`,
  '  const documentElement = document.documentElement;',
  '  const listener = (e) => {',
  '    const target = e.target;',
  `    if (!target || target.tagName !== 'LINK' || !target.hasAttribute(CSP_MEDIA_ATTR)) {`,
  '     return;',
  '    }',

  '    target.media = target.getAttribute(CSP_MEDIA_ATTR);',
  '    target.removeAttribute(CSP_MEDIA_ATTR);',

  // Remove onload listener when there are no longer styles that need to be loaded.
  '    if (!document.head.querySelector(`link[${CSP_MEDIA_ATTR}]`)) {',
  `      documentElement.removeEventListener('load', listener);`,
  '    }',
  '  };',

  //  We use an event with capturing (the true parameter) because load events don't bubble.
  `  documentElement.addEventListener('load', listener, true);`,
  '})();',
].join('\n');

export interface InlineCriticalCssProcessOptions {
  outputPath?: string;
}

export interface InlineCriticalCssProcessorOptions {
  minify?: boolean;
  deployUrl?: string;
}

export interface InlineCriticalCssResult {
  content: string;
  warnings?: string[];
  errors?: string[];
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

/** Signature of the `Critters.embedLinkedStylesheet` method. */
type EmbedLinkedStylesheetFn = (
  link: PartialHTMLElement,
  document: PartialDocument,
) => Promise<unknown>;

class CrittersExtended extends Critters {
  readonly warnings: string[] = [];
  readonly errors: string[] = [];
  private initialEmbedLinkedStylesheet: EmbedLinkedStylesheetFn;
  private addedCspScriptsDocuments = new WeakSet<PartialDocument>();
  private documentNonces = new WeakMap<PartialDocument, string | null>();

  // Inherited from `Critters`, but not exposed in the typings.
  protected declare embedLinkedStylesheet: EmbedLinkedStylesheetFn;

  constructor(
    readonly optionsExtended: InlineCriticalCssProcessorOptions & InlineCriticalCssProcessOptions,
    private readonly resourceCache: Map<string, string>,
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
      // `embedLinkedStylesheetOverride` will have to be updated.
      preload: 'media',
      noscriptFallback: true,
      inlineFonts: true,
    });

    // We can't use inheritance to override `embedLinkedStylesheet`, because it's not declared in
    // the `Critters` .d.ts which means that we can't call the `super` implementation. TS doesn't
    // allow for `super` to be cast to a different type.
    this.initialEmbedLinkedStylesheet = this.embedLinkedStylesheet;
    this.embedLinkedStylesheet = this.embedLinkedStylesheetOverride;
  }

  public override async readFile(path: string): Promise<string> {
    let resourceContent = this.resourceCache.get(path);
    if (resourceContent === undefined) {
      resourceContent = await readFile(path, 'utf-8');
      this.resourceCache.set(path, resourceContent);
    }

    return resourceContent;
  }

  /**
   * Override of the Critters `embedLinkedStylesheet` method
   * that makes it work with Angular's CSP APIs.
   */
  private embedLinkedStylesheetOverride: EmbedLinkedStylesheetFn = async (link, document) => {
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

    const returnValue = await this.initialEmbedLinkedStylesheet(link, document);
    const cspNonce = this.findCspNonce(document);

    if (cspNonce) {
      const crittersMedia = link.getAttribute('onload')?.match(MEDIA_SET_HANDLER_PATTERN);

      if (crittersMedia) {
        // If there's a Critters-generated `onload` handler and the file has an Angular CSP nonce,
        // we have to remove the handler, because it's incompatible with CSP. We save the value
        // in a different attribute and we generate a script tag with the nonce that uses
        // `addEventListener` to apply the media query instead.
        link.removeAttribute('onload');
        link.setAttribute(CSP_MEDIA_ATTR, crittersMedia[1]);
        this.conditionallyInsertCspLoadingScript(document, cspNonce, link);
      }

      // Ideally we would hook in at the time Critters inserts the `style` tags, but there isn't
      // a way of doing that at the moment so we fall back to doing it any time a `link` tag is
      // inserted. We mitigate it by only iterating the direct children of the `<head>` which
      // should be pretty shallow.
      document.head.children.forEach((child) => {
        if (child.tagName === 'style' && !child.hasAttribute('nonce')) {
          child.setAttribute('nonce', cspNonce);
        }
      });
    }

    return returnValue;
  };

  /**
   * Finds the CSP nonce for a specific document.
   */
  private findCspNonce(document: PartialDocument): string | null {
    if (this.documentNonces.has(document)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return this.documentNonces.get(document)!;
    }

    // HTML attribute are case-insensitive, but the parser used by Critters is case-sensitive.
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
    nonce: string,
    link: PartialHTMLElement,
  ): void {
    if (this.addedCspScriptsDocuments.has(document)) {
      return;
    }

    if (document.head.textContent.includes(LINK_LOAD_SCRIPT_CONTENT)) {
      // Script was already added during the build.
      this.addedCspScriptsDocuments.add(document);

      return;
    }

    const script = document.createElement('script');
    script.setAttribute('nonce', nonce);
    script.textContent = LINK_LOAD_SCRIPT_CONTENT;
    // Prepend the script to the head since it needs to
    // run as early as possible, before the `link` tags.
    document.head.insertBefore(script, link);
    this.addedCspScriptsDocuments.add(document);
  }
}

export class InlineCriticalCssProcessor {
  private readonly resourceCache = new Map<string, string>();

  constructor(protected readonly options: InlineCriticalCssProcessorOptions) {}

  async process(
    html: string,
    options: InlineCriticalCssProcessOptions,
  ): Promise<InlineCriticalCssResult> {
    const critters = new CrittersExtended({ ...this.options, ...options }, this.resourceCache);
    const content = await critters.process(html);

    return {
      content,
      errors: critters.errors.length ? critters.errors : undefined,
      warnings: critters.warnings.length ? critters.warnings : undefined,
    };
  }
}
