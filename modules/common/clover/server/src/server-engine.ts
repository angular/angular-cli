/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  ɵNGRenderMode as NGRenderMode,
  ɵNGRenderModeAPI as NGRenderModeAPI,
} from '@nguniversal/common/clover';
import * as fs from 'fs';
import { JSDOM } from 'jsdom';
import * as path from 'path';
import { URL } from 'url';
import { CustomResourceLoader } from './custom-resource-loader';
import { InlineCriticalCssProcessor } from './inline-css-processor';
import { augmentWindowWithStubs } from './stubs';

export interface RenderOptions {
  headers?: Record<string, string | undefined | string[]>;
  url: string;
  inlineCriticalCss?: boolean;
  htmlFilename?: string;
  publicPath: string;
}

export class Engine {
  private readonly fileExistsCache = new Map<string, boolean>();
  private readonly htmlFileCache = new Map<string, string>();
  private readonly resourceLoaderCache = new Map<string, Buffer>();
  private readonly inlineCriticalCssProcessor = new InlineCriticalCssProcessor(
    { minify: true },
    this.resourceLoaderCache,
  );

  async render(options: RenderOptions): Promise<string> {
    const { pathname, origin } = new URL(options.url);
    const prerenderedSnapshot = await this.getPrerenderedSnapshot(options.publicPath, pathname);

    if (prerenderedSnapshot) {
      return prerenderedSnapshot;
    }

    let htmlContent = await this.getHtmlTemplate(
      options.publicPath,
      pathname,
      options.htmlFilename,
    );
    const inlineCriticalCss = options.inlineCriticalCss !== false;

    const customResourceLoader = new CustomResourceLoader(
      origin,
      options.publicPath,
      this.resourceLoaderCache,
    );

    let dom: JSDOM | undefined;

    if (inlineCriticalCss) {
      // Workaround for https://github.com/GoogleChromeLabs/critters/issues/64
      htmlContent = htmlContent.replace(
        / media=\"print\" onload=\"this\.media='all'"><noscript><link .+?><\/noscript>/g,
        '>',
      );
    }

    try {
      dom = new JSDOM(htmlContent, {
        runScripts: 'dangerously',
        resources: customResourceLoader,
        url: options.url,
        referrer: options.headers?.referrer as string | undefined,
        userAgent: options.headers?.['user-agent'] as string | undefined,
        beforeParse: (window) => {
          augmentWindowWithStubs(window);
          window.ngRenderMode = true;
        },
      });

      const doc = dom.window.document;

      // 60s timeout.
      const stablizationTimeout = setTimeout(() => {
        throw new Error('Angular application failed to stablize after in time.');
      }, 60000);

      // tslint:disable-next-line: no-shadowed-variable
      const ngRenderMode = await new Promise<NGRenderModeAPI>((resolve) => {
        const interval = setInterval(() => {
          const ngDOMMode = dom?.window.ngRenderMode as NGRenderMode;
          if (ngDOMMode && typeof ngDOMMode === 'object') {
            // Poll until ngDOMMode is an object.
            clearTimeout(stablizationTimeout);
            clearInterval(interval);
            resolve(ngDOMMode);
          }
        }, 30);
      });

      await ngRenderMode.getWhenStable();
      doc.querySelector('[ng-version]')?.setAttribute('ng-clover', '');

      // Add Angular state
      const state = ngRenderMode.getSerializedState();
      if (state) {
        const script = doc.createElement('script');
        script.id = `${ngRenderMode.appId}-state`;
        script.setAttribute('type', 'application/json');
        script.textContent = state;
        doc.body.appendChild(script);
      }

      const content = dom.serialize();
      if (!inlineCriticalCss) {
        return content;
      }

      const baseHref = doc.querySelector('base[href]')?.getAttribute('href') ?? '';
      const {
        content: contentWithInlineCSS,
        warnings,
        errors,
      } = await this.inlineCriticalCssProcessor.process(content, {
        outputPath: path.join(options.publicPath, baseHref),
      });

      // tslint:disable-next-line: no-console
      warnings?.forEach((m) => console.warn(m));
      // tslint:disable-next-line: no-console
      errors?.forEach((m) => console.error(m));

      return contentWithInlineCSS;
    } finally {
      dom?.window.close();
    }
  }

  private async getPrerenderedSnapshot(
    publicPath: string,
    pathname: string,
  ): Promise<string | undefined> {
    // Remove leading forward slash.
    const pagePath = path.resolve(publicPath, pathname.substring(1), 'index.html');
    const content = await this.readHTMLFile(pagePath);

    return content?.includes('ng-version=')
      ? content // Page is pre-rendered
      : undefined;
  }

  private async getHtmlTemplate(
    publicPath: string,
    pathname: string,
    htmlFilename = 'index.html',
  ): Promise<string> {
    const files = [path.join(publicPath, htmlFilename)];

    const potentialLocalePath = pathname.split('/', 2)[1]; // potential base href
    if (potentialLocalePath) {
      files.push(path.join(publicPath, potentialLocalePath, htmlFilename));
    }

    for (const file of files) {
      const content = await this.readHTMLFile(file);
      if (content) {
        return content;
      }
    }

    throw new Error(`Cannot file HTML file. Looked in: ${files.join(', ')}`);
  }

  private async fileExists(filePath: string): Promise<boolean> {
    const fileExists = this.fileExistsCache.get(filePath);
    if (fileExists === undefined) {
      try {
        await fs.promises.access(filePath, fs.constants.F_OK);
        this.fileExistsCache.set(filePath, true);

        return true;
      } catch {
        this.fileExistsCache.set(filePath, false);

        return false;
      }
    }

    return fileExists;
  }

  private async readHTMLFile(filePath: string): Promise<string | undefined> {
    if (this.htmlFileCache.has(filePath)) {
      return this.htmlFileCache.get(filePath);
    }

    if (await this.fileExists(filePath)) {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      this.htmlFileCache.set(filePath, content);

      return content;
    }

    return undefined;
  }
}
