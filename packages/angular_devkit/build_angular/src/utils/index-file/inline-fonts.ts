/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as cacache from 'cacache';
import * as https from 'https';
import * as proxyAgent from 'https-proxy-agent';
import { URL } from 'url';
import { findCachePath } from '../cache-path';
import { cachingDisabled } from '../environment-options';
import { readFile } from '../fs';
import { htmlRewritingStream } from './html-rewriting-stream';

const cacheFontsPath: string | undefined = cachingDisabled ? undefined : findCachePath('angular-build-fonts');
const packageVersion = require('../../../package.json').version;

const enum UserAgent {
  Chrome = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36',
  IE = 'Mozilla/5.0 (Windows NT 10.0; Trident/7.0; rv:11. 0) like Gecko',
}

const SUPPORTED_PROVIDERS = [
  'fonts.googleapis.com',
];

export interface InlineFontsOptions {
  minify?: boolean;
  WOFFSupportNeeded: boolean;
}

export class InlineFontsProcessor {

  constructor(private options: InlineFontsOptions) { }

  async process(content: string): Promise<string> {
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
    const hrefsContent = await this.processHrefs(hrefList);
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
        rewriter.emitRaw(`<style type="text/css">${cssContent}</style>`);
      } else {
        rewriter.emitStartTag(tag);
      }
    });

    return transformedContent;
  }

  private async getResponse(url: URL, userAgent: UserAgent): Promise<string> {
    const key = `${packageVersion}|${url}|${userAgent}`;

    if (cacheFontsPath) {
      const entry = await cacache.get.info(cacheFontsPath, key);
      if (entry) {
        return readFile(entry.path, 'utf8');
      }
    }

    let agent: proxyAgent.HttpsProxyAgent | undefined;
    const httpsProxy = process.env.HTTPS_PROXY ?? process.env.https_proxy;

    if (httpsProxy) {
      agent = proxyAgent(httpsProxy);
    }

    const data = await new Promise<string>((resolve, reject) => {
      let rawResponse = '';
      https.get(
        url,
        {
          agent,
          rejectUnauthorized: false,
          headers: {
            'user-agent': userAgent,
          },
        },
        res => {
          res
            .on('data', chunk => rawResponse += chunk)
            .on('end', () => resolve(rawResponse));
        },
      )
        .on('error', e =>
          reject(new Error(
            `Inlining of fonts failed. An error has occurred while retrieving ${url} over the internet.\n` +
            e.message,
          )));
    });

    if (cacheFontsPath) {
      await cacache.put(cacheFontsPath, key, data);
    }

    return data;
  }

  private async processHrefs(hrefList: string[]): Promise<Map<string, string>> {
    const hrefsContent = new Map<string, string>();

    for (const hrefPath of hrefList) {
      // Need to convert '//' to 'https://' because the URL parser will fail with '//'.
      const normalizedHref = hrefPath.startsWith('//') ? `https:${hrefPath}` : hrefPath;
      if (!normalizedHref.startsWith('http')) {
        // Non valid URL.
        // Example: relative path styles.css.
        continue;
      }

      const url = new URL(normalizedHref);
      // Force HTTPS protocol
      url.protocol = 'https:';

      if (!SUPPORTED_PROVIDERS.includes(url.hostname)) {
        // Provider not supported.
        continue;
      }

      // The order IE -> Chrome is important as otherwise Chrome will load woff1.
      let cssContent = '';
      if (this.options.WOFFSupportNeeded) {
        cssContent += await this.getResponse(url, UserAgent.IE);
      }
      cssContent += await this.getResponse(url, UserAgent.Chrome);

      if (this.options.minify) {
        cssContent = cssContent
          // Comments.
          .replace(/\/\*([\s\S]*?)\*\//g, '')
          // New lines.
          .replace(/\n/g, '')
          // Safe spaces.
          .replace(/\s?[\{\:\;]\s+/g, s => s.trim());
      }

      hrefsContent.set(hrefPath, cssContent);
    }

    return hrefsContent;
  }
}
