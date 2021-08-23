/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as cacache from 'cacache';
import * as fs from 'fs';
import * as https from 'https';
import proxyAgent from 'https-proxy-agent';
import { URL } from 'url';
import { findCachePath } from '../cache-path';
import { cachingDisabled } from '../environment-options';
import { htmlRewritingStream } from './html-rewriting-stream';

const cacheFontsPath: string | undefined = cachingDisabled
  ? undefined
  : findCachePath('angular-build-fonts');
const packageVersion = require('../../../package.json').version;

interface FontProviderDetails {
  preconnectUrl: string;
}

export interface InlineFontsOptions {
  minify?: boolean;
}

const SUPPORTED_PROVIDERS: Record<string, FontProviderDetails> = {
  'fonts.googleapis.com': {
    preconnectUrl: 'https://fonts.gstatic.com',
  },
  'use.typekit.net': {
    preconnectUrl: 'https://use.typekit.net',
  },
};

export class InlineFontsProcessor {
  constructor(private options: InlineFontsOptions) {}

  async process(content: string): Promise<string> {
    const hrefList: string[] = [];
    const existingPreconnect = new Set<string>();

    // Collector link tags with href
    const { rewriter: collectorStream } = await htmlRewritingStream(content);

    collectorStream.on('startTag', (tag) => {
      const { tagName, attrs } = tag;

      if (tagName !== 'link') {
        return;
      }

      let hrefValue: string | undefined;
      let relValue: string | undefined;
      for (const { name, value } of attrs) {
        switch (name) {
          case 'rel':
            relValue = value;
            break;

          case 'href':
            hrefValue = value;
            break;
        }

        if (hrefValue && relValue) {
          switch (relValue) {
            case 'stylesheet':
              // <link rel="stylesheet" href="https://example.com/main.css">
              hrefList.push(hrefValue);
              break;

            case 'preconnect':
              // <link rel="preconnect" href="https://example.com">
              existingPreconnect.add(hrefValue.replace(/\/$/, ''));
              break;
          }

          return;
        }
      }
    });

    await new Promise((resolve) => collectorStream.on('finish', resolve));

    // Download stylesheets
    const hrefsContent = new Map<string, string>();
    const newPreconnectUrls = new Set<string>();

    for (const hrefItem of hrefList) {
      const url = this.createNormalizedUrl(hrefItem);
      if (!url) {
        continue;
      }

      const content = await this.processHref(url);
      if (content === undefined) {
        continue;
      }

      hrefsContent.set(hrefItem, content);

      // Add preconnect
      const preconnectUrl = this.getFontProviderDetails(url)?.preconnectUrl;
      if (preconnectUrl && !existingPreconnect.has(preconnectUrl)) {
        newPreconnectUrls.add(preconnectUrl);
      }
    }

    if (hrefsContent.size === 0) {
      return content;
    }

    // Replace link with style tag.
    const { rewriter, transformedContent } = await htmlRewritingStream(content);
    rewriter.on('startTag', (tag) => {
      const { tagName, attrs } = tag;

      switch (tagName) {
        case 'head':
          rewriter.emitStartTag(tag);
          for (const url of newPreconnectUrls) {
            rewriter.emitRaw(`<link rel="preconnect" href="${url}" crossorigin>`);
          }
          break;

        case 'link':
          const hrefAttr =
            attrs.some(({ name, value }) => name === 'rel' && value === 'stylesheet') &&
            attrs.find(({ name, value }) => name === 'href' && hrefsContent.has(value));
          if (hrefAttr) {
            const href = hrefAttr.value;
            const cssContent = hrefsContent.get(href);
            rewriter.emitRaw(`<style type="text/css">${cssContent}</style>`);
          } else {
            rewriter.emitStartTag(tag);
          }
          break;

        default:
          rewriter.emitStartTag(tag);

          break;
      }
    });

    return transformedContent;
  }

  private async getResponse(url: URL): Promise<string> {
    const key = `${packageVersion}|${url}`;

    if (cacheFontsPath) {
      const entry = await cacache.get.info(cacheFontsPath, key);
      if (entry) {
        return fs.promises.readFile(entry.path, 'utf8');
      }
    }

    let agent: proxyAgent.HttpsProxyAgent | undefined;
    const httpsProxy = process.env.HTTPS_PROXY ?? process.env.https_proxy;

    if (httpsProxy) {
      agent = proxyAgent(httpsProxy);
    }

    const data = await new Promise<string>((resolve, reject) => {
      let rawResponse = '';
      https
        .get(
          url,
          {
            agent,
            rejectUnauthorized: false,
            headers: {
              'user-agent':
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36',
            },
          },
          (res) => {
            if (res.statusCode !== 200) {
              reject(
                new Error(
                  `Inlining of fonts failed. ${url} returned status code: ${res.statusCode}.`,
                ),
              );

              return;
            }

            res.on('data', (chunk) => (rawResponse += chunk)).on('end', () => resolve(rawResponse));
          },
        )
        .on('error', (e) =>
          reject(
            new Error(
              `Inlining of fonts failed. An error has occurred while retrieving ${url} over the internet.\n` +
                e.message,
            ),
          ),
        );
    });

    if (cacheFontsPath) {
      await cacache.put(cacheFontsPath, key, data);
    }

    return data;
  }

  private async processHref(url: URL): Promise<string | undefined> {
    const provider = this.getFontProviderDetails(url);
    if (!provider) {
      return undefined;
    }

    let cssContent = await this.getResponse(url);

    if (this.options.minify) {
      cssContent = cssContent
        // Comments.
        .replace(/\/\*([\s\S]*?)\*\//g, '')
        // New lines.
        .replace(/\n/g, '')
        // Safe spaces.
        .replace(/\s?[{:;]\s+/g, (s) => s.trim());
    }

    return cssContent;
  }

  private getFontProviderDetails(url: URL): FontProviderDetails | undefined {
    return SUPPORTED_PROVIDERS[url.hostname];
  }

  private createNormalizedUrl(value: string): URL | undefined {
    // Need to convert '//' to 'https://' because the URL parser will fail with '//'.
    const normalizedHref = value.startsWith('//') ? `https:${value}` : value;
    if (!normalizedHref.startsWith('http')) {
      // Non valid URL.
      // Example: relative path styles.css.
      return undefined;
    }

    const url = new URL(normalizedHref);
    // Force HTTPS protocol
    url.protocol = 'https:';

    return url;
  }
}
