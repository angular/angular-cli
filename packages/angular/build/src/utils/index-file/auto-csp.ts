/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import * as crypto from 'node:crypto';
import { StartTag, htmlRewritingStream } from './html-rewriting-stream';

/**
 * The hash function to use for hash directives to use in the CSP.
 */
const HASH_FUNCTION = 'sha256';

/**
 * Store the appropriate attributes of a sourced script tag to generate the loader script.
 */
interface SrcScriptTag {
  src: string;
  type?: string;
  async: boolean;
  defer: boolean;
}

/**
 * Get the specified attribute or return undefined if the tag doesn't have that attribute.
 *
 * @param tag StartTag of the <script>
 * @returns
 */
function getScriptAttributeValue(tag: StartTag, attrName: string): string | undefined {
  return tag.attrs.find((attr) => attr.name === attrName)?.value;
}

/**
 * Checks whether a particular string is a MIME type associated with JavaScript, according to
 * https://developer.mozilla.org/en-US/docs/Web/HTTP/MIME_types#textjavascript
 *
 * @param mimeType a string that may be a MIME type
 * @returns whether the string is a MIME type that is associated with JavaScript
 */
function isJavascriptMimeType(mimeType: string): boolean {
  return mimeType.split(';')[0] === 'text/javascript';
}

/**
 * Which of the type attributes on the script tag we should try passing along
 * based on https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type
 * @param scriptType the `type` attribute on the `<script>` tag under question
 * @returns whether to add the script tag to the dynamically loaded script tag
 */
function shouldDynamicallyLoadScriptTagBasedOnType(scriptType: string | undefined): boolean {
  return (
    scriptType === undefined ||
    scriptType === '' ||
    scriptType === 'module' ||
    isJavascriptMimeType(scriptType)
  );
}

/**
 * Calculates a CSP compatible hash of an inline script.
 * @param scriptText Text between opening and closing script tag. Has to
 *     include whitespaces and newlines!
 * @returns The hash of the text formatted appropriately for CSP.
 */
export function hashTextContent(scriptText: string): string {
  const hash = crypto.createHash(HASH_FUNCTION).update(scriptText, 'utf-8').digest('base64');

  return `'${HASH_FUNCTION}-${hash}'`;
}

/**
 * Finds all `<script>` tags and creates a dynamic script loading block for consecutive `<script>` with `src` attributes.
 * Hashes all scripts, both inline and generated dynamic script loading blocks.
 * Inserts a `<meta>` tag at the end of the `<head>` of the document with the generated hash-based CSP.
 *
 * @param html Markup that should be processed.
 * @returns The transformed HTML that contains the `<meta>` tag CSP and dynamic loader scripts.
 */
export async function autoCsp(html: string, unsafeEval = false): Promise<string> {
  const { rewriter, transformedContent } = await htmlRewritingStream(html);

  let openedScriptTag: StartTag | undefined = undefined;
  let scriptContent: SrcScriptTag[] = [];
  const hashes: string[] = [];

  /**
   * Generates the dynamic loading script and puts it in the rewriter and adds the hash of the dynamic
   * loader script to the collection of hashes to add to the <meta> tag CSP.
   */
  function emitLoaderScript() {
    const loaderScript = createLoaderScript(scriptContent);
    hashes.push(hashTextContent(loaderScript));
    rewriter.emitRaw(`<script>${loaderScript}</script>`);
    scriptContent = [];
  }

  rewriter.on('startTag', (tag, html) => {
    if (tag.tagName === 'script') {
      openedScriptTag = tag;
      const src = getScriptAttributeValue(tag, 'src');

      if (src) {
        // If there are any interesting attributes, note them down.
        const scriptType = getScriptAttributeValue(tag, 'type');
        if (shouldDynamicallyLoadScriptTagBasedOnType(scriptType)) {
          scriptContent.push({
            src: src,
            type: scriptType,
            async: getScriptAttributeValue(tag, 'async') !== undefined,
            defer: getScriptAttributeValue(tag, 'defer') !== undefined,
          });

          return; // Skip writing my script tag until we've read it all.
        }
      }
    }
    // We are encountering the first start tag that's not <script src="..."> after a string of
    // consecutive <script src="...">. <script> tags without a src attribute will also end a chain
    // of src attributes that can be loaded in a single loader script, so those will end up here.
    //
    // The first place when we can determine this to be the case is
    // during the first opening tag that's not <script src="...">, where we need to insert the
    // dynamic loader script before continuing on with writing the rest of the tags.
    // (One edge case is where there are no more opening tags after the last <script src="..."> is
    // closed, but this case is handled below with the final </body> tag.)
    if (scriptContent.length > 0) {
      emitLoaderScript();
    }
    rewriter.emitStartTag(tag);
  });

  rewriter.on('text', (tag, html) => {
    if (openedScriptTag && !getScriptAttributeValue(openedScriptTag, 'src')) {
      hashes.push(hashTextContent(html));
    }
    rewriter.emitText(tag);
  });

  rewriter.on('endTag', (tag, html) => {
    if (openedScriptTag && tag.tagName === 'script') {
      const src = getScriptAttributeValue(openedScriptTag, 'src');
      const scriptType = getScriptAttributeValue(openedScriptTag, 'type');
      openedScriptTag = undefined;
      // Return early to avoid writing the closing </script> tag if it's a part of the
      // dynamic loader script.
      if (src && shouldDynamicallyLoadScriptTagBasedOnType(scriptType)) {
        return;
      }
    }

    if (tag.tagName === 'body' || tag.tagName === 'html') {
      // Write the loader script if a string of <script>s were the last opening tag of the document.
      if (scriptContent.length > 0) {
        emitLoaderScript();
      }
    }
    rewriter.emitEndTag(tag);
  });

  const rewritten = await transformedContent();

  // Second pass to add the header
  const secondPass = await htmlRewritingStream(rewritten);
  secondPass.rewriter.on('startTag', (tag, _) => {
    secondPass.rewriter.emitStartTag(tag);
    if (tag.tagName === 'head') {
      // See what hashes we came up with!
      secondPass.rewriter.emitRaw(
        `<meta http-equiv="Content-Security-Policy" content="${getStrictCsp(hashes, {
          enableBrowserFallbacks: true,
          enableTrustedTypes: false,
          enableUnsafeEval: unsafeEval,
        })}">`,
      );
    }
  });

  return secondPass.transformedContent();
}

/**
 * Returns a strict Content Security Policy for mitigating XSS.
 * For more details read csp.withgoogle.com.
 * If you modify this CSP, make sure it has not become trivially bypassable by
 * checking the policy using csp-evaluator.withgoogle.com.
 *
 * @param hashes A list of sha-256 hashes of trusted inline scripts.
 * @param enableTrustedTypes If Trusted Types should be enabled for scripts.
 * @param enableBrowserFallbacks If fallbacks for older browsers should be
 *   added. This is will not weaken the policy as modern browsers will ignore
 *   the fallbacks.
 * @param enableUnsafeEval If you cannot remove all uses of eval(), you can
 *   still set a strict CSP, but you will have to use the 'unsafe-eval'
 *   keyword which will make your policy slightly less secure.
 */
function getStrictCsp(
  hashes?: string[],
  // default CSP options
  cspOptions: {
    enableBrowserFallbacks?: boolean;
    enableTrustedTypes?: boolean;
    enableUnsafeEval?: boolean;
  } = {
    enableBrowserFallbacks: true,
    enableTrustedTypes: false,
    enableUnsafeEval: false,
  },
): string {
  hashes = hashes || [];
  const strictCspTemplate: Record<string, string[]> = {
    // 'strict-dynamic' allows hashed scripts to create new scripts.
    'script-src': [`'strict-dynamic'`, ...hashes],
    // Restricts `object-src` to disable dangerous plugins like Flash.
    'object-src': [`'none'`],
    // Restricts `base-uri` to block the injection of `<base>` tags. This
    // prevents attackers from changing the locations of scripts loaded from
    // relative URLs.
    'base-uri': [`'self'`],
  };

  // Adds fallbacks for browsers not compatible to CSP3 and CSP2.
  // These fallbacks are ignored by modern browsers in presence of hashes,
  // and 'strict-dynamic'.
  if (cspOptions.enableBrowserFallbacks) {
    // Fallback for Safari. All modern browsers supporting strict-dynamic will
    // ignore the 'https:' fallback.
    strictCspTemplate['script-src'].push('https:');
    // 'unsafe-inline' is only ignored in presence of a hash or nonce.
    if (hashes.length > 0) {
      strictCspTemplate['script-src'].push(`'unsafe-inline'`);
    }
  }

  // If enabled, dangerous DOM sinks will only accept typed objects instead of
  // strings.
  if (cspOptions.enableTrustedTypes) {
    strictCspTemplate['require-trusted-types-for'] = ['script'];
  }

  // If enabled, `eval()`-calls will be allowed, making the policy slightly
  // less secure.
  if (cspOptions.enableUnsafeEval) {
    strictCspTemplate['script-src'].push(`'unsafe-eval'`);
  }

  return Object.entries(strictCspTemplate)
    .map(([directive, values]) => {
      return `${directive} ${values.join(' ')};`;
    })
    .join('');
}

/**
 * Returns JS code for dynamically loading sourced (external) scripts.
 * @param srcList A list of paths for scripts that should be loaded.
 */
function createLoaderScript(srcList: SrcScriptTag[], enableTrustedTypes = false): string {
  if (!srcList.length) {
    throw new Error('Cannot create a loader script with no scripts to load.');
  }
  const srcListFormatted = srcList
    .map((s) => {
      // URI encoding means value can't escape string, JS, or HTML context.
      const srcAttr = encodeURI(s.src).replaceAll("'", "\\'");
      // Can only be 'module' or a JS MIME type or an empty string.
      const typeAttr = s.type ? "'" + s.type + "'" : undefined;
      const asyncAttr = s.async ? 'true' : 'false';
      const deferAttr = s.defer ? 'true' : 'false';

      return `['${srcAttr}', ${typeAttr}, ${asyncAttr}, ${deferAttr}]`;
    })
    .join();

  return enableTrustedTypes
    ? `
  var scripts = [${srcListFormatted}];
  var policy = self.trustedTypes && self.trustedTypes.createPolicy ?
    self.trustedTypes.createPolicy('angular#auto-csp', {createScriptURL: function(u) {
      return scripts.includes(u) ? u : null;
    }}) : { createScriptURL: function(u) { return u; } };
  scripts.forEach(function(scriptUrl) {
    var s = document.createElement('script');
    s.src = policy.createScriptURL(scriptUrl[0]);
    s.type = scriptUrl[1];
    s.async = !!scriptUrl[2];
    s.defer = !!scriptUrl[3];
    document.body.appendChild(s);
  });\n`
    : `
  var scripts = [${srcListFormatted}];
  scripts.forEach(function(scriptUrl) {
    var s = document.createElement('script');
    s.src = scriptUrl[0];
    s.type = scriptUrl[1];
    s.async = !!scriptUrl[2];
    s.defer = !!scriptUrl[3];
    document.body.appendChild(s);
  });\n`;
}
