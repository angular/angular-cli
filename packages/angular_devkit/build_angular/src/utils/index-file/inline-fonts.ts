/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as https from 'https';
import { htmlRewritingStream } from './html-rewriting-stream';

const enum UserAgent {
  Chrome = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko)',
  IE = 'Mozilla/5.0 (Windows NT 10.0; Trident/7.0; rv:11.0) like Gecko',
}

const SUPPORTED_PROVIDERS = [
  'https://fonts.googleapis.com/',
];

export interface InlineFontsOptions {
  content: string;
  minifyInlinedCSS: boolean;
  WOFF1SupportNeeded: boolean;
}

export class InlineFontsProcessor {
  private readonly ResponseCache = new Map<string, string>();

  async process(options: InlineFontsOptions): Promise<string> {
    const {
      content,
      minifyInlinedCSS,
      WOFF1SupportNeeded,
    } = options;

    const hrefList: string[] = [];

    // Collector link tags with href
    const { rewriter: collectorStream } = await htmlRewritingStream(content);

    collectorStream.on('startTag', tag => {
      const { tagName, attrs } = tag;

      if (tagName !== 'link') {
        return;
      }

      // <link tag with rel="stylesheet" and a href.
      const href = attrs.find(({ name, value }) => name === 'rel' && value === 'stylesheet')
        && attrs.find(({ name }) => name === 'href')?.value;

      if (href) {
        hrefList.push(href);
      }
    });

    await new Promise(resolve => collectorStream.on('finish', resolve));

    // Download stylesheets
    const hrefsContent = await this.processHrefs(hrefList, minifyInlinedCSS, WOFF1SupportNeeded);
    if (hrefsContent.size === 0) {
      return content;
    }

    // Replace link with style tag.
    const { rewriter, transformedContent } = await htmlRewritingStream(content);
    rewriter.on('startTag', tag => {
      const { tagName, attrs } = tag;

      if (tagName !== 'link') {
        rewriter.emitStartTag(tag);

        return;
      }

      const hrefAttr = attrs.some(({ name, value }) => name === 'rel' && value === 'stylesheet')
        && attrs.find(({ name, value }) => name === 'href' && hrefsContent.has(value));
      if (hrefAttr) {
        const href = hrefAttr.value;
        const cssContent = hrefsContent.get(href);
        rewriter.emitRaw(`<style type="text/css" title="${href}">${cssContent}</style>`);
      } else {
        rewriter.emitStartTag(tag);
      }
    });

    return transformedContent;
  }

  private async getResponse(url: string, userAgent: UserAgent): Promise<string> {
    const key = url + userAgent;

    if (this.ResponseCache.has(key)) {
      // tslint:disable-next-line: no-non-null-assertion
      return this.ResponseCache.get(key)!;
    }

    return new Promise((resolve, reject) => {
      let rawResponse = '';

      https.get(
        url,
        {
          headers: {
            'user-agent': userAgent,
          },
        },
        res => {
          res
            .on('data', chunk => rawResponse += chunk)
            .on('end', () => {
              const response = rawResponse.toString();
              this.ResponseCache.set(key, response);
              resolve(response);
            });
        },
      )
        .on('error', e => reject(e));
    });
  }

  private async processHrefs(hrefList: string[], minifyInlinedCSS: boolean, WOFF1SupportNeeded: boolean): Promise<Map<string, string>> {
    const hrefsContent = new Map<string, string>();

    for (const href of hrefList) {
      // Normalize protocols to https://
      let normalizedHref = href;
      if (!href.startsWith('https://')) {
        if (href.startsWith('//')) {
          normalizedHref = 'https:' + href;
        } else if (href.startsWith('http://')) {
          normalizedHref = href.replace('http:', 'https:');
        } else {
          // Unsupported CSS href.
          continue;
        }
      }

      if (!SUPPORTED_PROVIDERS.some(url => normalizedHref.startsWith(url))) {
        // Provider not supported.
        continue;
      }

      // The order IE -> Chrome is important as otherwise Chrome will load woff1.
      let cssContent = '';
      if (WOFF1SupportNeeded) {
        cssContent += await this.getResponse(normalizedHref, UserAgent.IE);
      }
      cssContent += await this.getResponse(normalizedHref, UserAgent.Chrome);

      if (minifyInlinedCSS) {
        cssContent = cssContent
          // Comments and new lines.
          .replace(/(\n|\/\*\s.+\s\*\/)/g, '')
          // Safe spaces.
          .replace(/\s?[\{\:\;]\s+/g, s => s.trim());
      }

      hrefsContent.set(href, cssContent);
    }

    return hrefsContent;
  }
}
