/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as fs from 'fs';
import { join } from 'path';
import { NormalizedCachedOptions } from '../normalize-cache';
import { NormalizedOptimizationOptions } from '../normalize-optimization';
import { stripBom } from '../strip-bom';
import { CrossOriginValue, Entrypoint, FileInfo, augmentIndexHtml } from './augment-index-html';
import { InlineCriticalCssProcessor } from './inline-critical-css';
import { InlineFontsProcessor } from './inline-fonts';
import { addStyleNonce } from './style-nonce';

type IndexHtmlGeneratorPlugin = (
  html: string,
  options: IndexHtmlGeneratorProcessOptions,
) => Promise<string | IndexHtmlTransformResult>;

export type HintMode = 'prefetch' | 'preload' | 'modulepreload' | 'preconnect' | 'dns-prefetch';

export interface IndexHtmlGeneratorProcessOptions {
  lang: string | undefined;
  baseHref: string | undefined;
  outputPath: string;
  files: FileInfo[];
  hints?: { url: string; mode: HintMode }[];
}

export interface IndexHtmlGeneratorOptions {
  indexPath: string;
  deployUrl?: string;
  sri?: boolean;
  entrypoints: Entrypoint[];
  postTransform?: IndexHtmlTransform;
  crossOrigin?: CrossOriginValue;
  optimization?: NormalizedOptimizationOptions;
  cache?: NormalizedCachedOptions;
}

export type IndexHtmlTransform = (content: string) => Promise<string>;

export interface IndexHtmlTransformResult {
  content: string;
  warnings: string[];
  errors: string[];
}

export class IndexHtmlGenerator {
  private readonly plugins: IndexHtmlGeneratorPlugin[];

  constructor(readonly options: IndexHtmlGeneratorOptions) {
    const extraPlugins: IndexHtmlGeneratorPlugin[] = [];
    if (this.options.optimization?.fonts.inline) {
      extraPlugins.push(inlineFontsPlugin(this));
    }

    if (this.options.optimization?.styles.inlineCritical) {
      extraPlugins.push(inlineCriticalCssPlugin(this));
    }

    this.plugins = [
      augmentIndexHtmlPlugin(this),
      ...extraPlugins,
      // Runs after the `extraPlugins` to capture any nonce or
      // `style` tags that might've been added by them.
      addStyleNoncePlugin(),
      postTransformPlugin(this),
    ];
  }

  async process(options: IndexHtmlGeneratorProcessOptions): Promise<IndexHtmlTransformResult> {
    let content = stripBom(await this.readIndex(this.options.indexPath));
    const warnings: string[] = [];
    const errors: string[] = [];

    for (const plugin of this.plugins) {
      const result = await plugin(content, options);
      if (typeof result === 'string') {
        content = result;
      } else {
        content = result.content;

        if (result.warnings.length) {
          warnings.push(...result.warnings);
        }

        if (result.errors.length) {
          errors.push(...result.errors);
        }
      }
    }

    return {
      content,
      warnings,
      errors,
    };
  }

  async readAsset(path: string): Promise<string> {
    return fs.promises.readFile(path, 'utf-8');
  }

  protected async readIndex(path: string): Promise<string> {
    return fs.promises.readFile(path, 'utf-8');
  }
}

function augmentIndexHtmlPlugin(generator: IndexHtmlGenerator): IndexHtmlGeneratorPlugin {
  const { deployUrl, crossOrigin, sri = false, entrypoints } = generator.options;

  return async (html, options) => {
    const { lang, baseHref, outputPath = '', files, hints } = options;

    return augmentIndexHtml({
      html,
      baseHref,
      deployUrl,
      crossOrigin,
      sri,
      lang,
      entrypoints,
      loadOutputFile: (filePath) => generator.readAsset(join(outputPath, filePath)),
      files,
      hints,
    });
  };
}

function inlineFontsPlugin({ options }: IndexHtmlGenerator): IndexHtmlGeneratorPlugin {
  const inlineFontsProcessor = new InlineFontsProcessor({
    minify: options.optimization?.styles.minify,
  });

  return async (html) => inlineFontsProcessor.process(html);
}

function inlineCriticalCssPlugin(generator: IndexHtmlGenerator): IndexHtmlGeneratorPlugin {
  const inlineCriticalCssProcessor = new InlineCriticalCssProcessor({
    minify: generator.options.optimization?.styles.minify,
    deployUrl: generator.options.deployUrl,
    readAsset: (filePath) => generator.readAsset(filePath),
  });

  return async (html, options) =>
    inlineCriticalCssProcessor.process(html, { outputPath: options.outputPath });
}

function addStyleNoncePlugin(): IndexHtmlGeneratorPlugin {
  return (html) => addStyleNonce(html);
}

function postTransformPlugin({ options }: IndexHtmlGenerator): IndexHtmlGeneratorPlugin {
  return async (html) => (options.postTransform ? options.postTransform(html) : html);
}
