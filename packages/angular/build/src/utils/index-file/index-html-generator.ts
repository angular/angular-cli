/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NormalizedCachedOptions } from '../normalize-cache';
import { NormalizedOptimizationOptions } from '../normalize-optimization';
import { addEventDispatchContract } from './add-event-dispatch-contract';
import { CrossOriginValue, Entrypoint, FileInfo, augmentIndexHtml } from './augment-index-html';
import { InlineCriticalCssProcessor } from './inline-critical-css';
import { InlineFontsProcessor } from './inline-fonts';
import { addNgcmAttribute } from './ngcm-attribute';
import { addNonce } from './nonce';

type IndexHtmlGeneratorPlugin = (
  html: string,
  options: IndexHtmlGeneratorProcessOptions,
) => Promise<string | IndexHtmlPluginTransformResult> | string;

export type HintMode = 'prefetch' | 'preload' | 'modulepreload' | 'preconnect' | 'dns-prefetch';

export interface IndexHtmlGeneratorProcessOptions {
  lang: string | undefined;
  baseHref: string | undefined;
  outputPath: string;
  files: FileInfo[];
  hints?: { url: string; mode: HintMode; as?: string }[];
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
  imageDomains?: string[];
  generateDedicatedSSRContent?: boolean;
}

export type IndexHtmlTransform = (content: string) => Promise<string>;

export interface IndexHtmlPluginTransformResult {
  content: string;
  warnings: string[];
  errors: string[];
}

export interface IndexHtmlProcessResult {
  csrContent: string;
  ssrContent?: string;
  warnings: string[];
  errors: string[];
}

export class IndexHtmlGenerator {
  private readonly plugins: IndexHtmlGeneratorPlugin[];
  private readonly csrPlugins: IndexHtmlGeneratorPlugin[] = [];
  private readonly ssrPlugins: IndexHtmlGeneratorPlugin[] = [];

  constructor(readonly options: IndexHtmlGeneratorOptions) {
    const extraCommonPlugins: IndexHtmlGeneratorPlugin[] = [];
    if (options?.optimization?.fonts.inline) {
      extraCommonPlugins.push(inlineFontsPlugin(this), addNonce);
    }

    // Common plugins
    this.plugins = [augmentIndexHtmlPlugin(this), ...extraCommonPlugins, postTransformPlugin(this)];

    // CSR plugins
    if (options?.optimization?.styles?.inlineCritical) {
      this.csrPlugins.push(inlineCriticalCssPlugin(this));
    }

    this.csrPlugins.push(addNoncePlugin());

    // SSR plugins
    if (options.generateDedicatedSSRContent) {
      this.csrPlugins.push(addNgcmAttributePlugin());
      this.ssrPlugins.push(addEventDispatchContractPlugin(), addNoncePlugin());
    }
  }

  async process(options: IndexHtmlGeneratorProcessOptions): Promise<IndexHtmlProcessResult> {
    let content = await this.readIndex(this.options.indexPath);
    const warnings: string[] = [];
    const errors: string[] = [];

    content = await this.runPlugins(content, this.plugins, options, warnings, errors);
    const [csrContent, ssrContent] = await Promise.all([
      this.runPlugins(content, this.csrPlugins, options, warnings, errors),
      this.ssrPlugins.length
        ? this.runPlugins(content, this.ssrPlugins, options, warnings, errors)
        : undefined,
    ]);

    return {
      ssrContent,
      csrContent,
      warnings,
      errors,
    };
  }

  private async runPlugins(
    content: string,
    plugins: IndexHtmlGeneratorPlugin[],
    options: IndexHtmlGeneratorProcessOptions,
    warnings: string[],
    errors: string[],
  ): Promise<string> {
    for (const plugin of plugins) {
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

    return content;
  }

  async readAsset(path: string): Promise<string> {
    try {
      return await readFile(path, 'utf-8');
    } catch {
      throw new Error(`Failed to read asset "${path}".`);
    }
  }

  protected async readIndex(path: string): Promise<string> {
    try {
      return new TextDecoder('utf-8').decode(await readFile(path));
    } catch (cause) {
      throw new Error(`Failed to read index HTML file "${path}".`, { cause });
    }
  }
}

function augmentIndexHtmlPlugin(generator: IndexHtmlGenerator): IndexHtmlGeneratorPlugin {
  const { deployUrl, crossOrigin, sri = false, entrypoints, imageDomains } = generator.options;

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
      imageDomains,
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

function addNoncePlugin(): IndexHtmlGeneratorPlugin {
  return (html) => addNonce(html);
}

function postTransformPlugin({ options }: IndexHtmlGenerator): IndexHtmlGeneratorPlugin {
  return async (html) => (options.postTransform ? options.postTransform(html) : html);
}

function addEventDispatchContractPlugin(): IndexHtmlGeneratorPlugin {
  return (html) => addEventDispatchContract(html);
}

function addNgcmAttributePlugin(): IndexHtmlGeneratorPlugin {
  return (html) => addNgcmAttribute(html);
}
