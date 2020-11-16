/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { join } from 'path';
import { readFile } from '../fs';
import { NormalizeOptimizationOptions } from '../normalize-optimization';
import { stripBom } from '../strip-bom';
import { CrossOriginValue, FileInfo, augmentIndexHtml } from './augment-index-html';
import { InlineFontsProcessor } from './inline-fonts';

type IndexHtmlGeneratorPlugin = (html: string, options: IndexHtmlGeneratorProcessOptions) => Promise<string>;

export interface IndexHtmlGeneratorProcessOptions {
  lang: string | undefined;
  baseHref: string | undefined;
  outputPath: string;
  files: FileInfo[];
  noModuleFiles: FileInfo[];
  moduleFiles: FileInfo[];
}

export interface IndexHtmlGeneratorOptions {
  indexPath: string;
  deployUrl?: string;
  sri?: boolean;
  entrypoints: string[];
  postTransform?: IndexHtmlTransform;
  crossOrigin?: CrossOriginValue;
  optimization?: NormalizeOptimizationOptions;
  WOFFSupportNeeded: boolean;
}

export type IndexHtmlTransform = (content: string) => Promise<string>;

export class IndexHtmlGenerator {
  private readonly plugins: IndexHtmlGeneratorPlugin[];

  constructor(readonly options: IndexHtmlGeneratorOptions) {
    const extraPlugins: IndexHtmlGeneratorPlugin[] = [];
    if (this.options.optimization?.fonts.inline) {
      extraPlugins.push(inlineFontsPlugin(this));
    }

    this.plugins = [
      augmentIndexHtmlPlugin(this),
      ...extraPlugins,
      postTransformPlugin(this),
    ];
  }

  async process(options: IndexHtmlGeneratorProcessOptions): Promise<string> {
    let html = stripBom(await this.readIndex(this.options.indexPath));

    for (const plugin of this.plugins) {
      html = await plugin(html, options);
    }

    return html;
  }

  async readAsset(path: string): Promise<string> {
    return readFile(path, 'utf-8');
  }

  protected async readIndex(path: string): Promise<string> {
    return readFile(path, 'utf-8');
  }
}

function augmentIndexHtmlPlugin(generator: IndexHtmlGenerator): IndexHtmlGeneratorPlugin {
  const {
    deployUrl,
    crossOrigin,
    sri = false,
    entrypoints,
  } = generator.options;

  return async (html, options) => {
    const {
      lang,
      baseHref,
      outputPath = '',
      noModuleFiles,
      files,
      moduleFiles,
    } = options;

    return augmentIndexHtml({
      html,
      baseHref,
      deployUrl,
      crossOrigin,
      sri,
      lang,
      entrypoints,
      loadOutputFile: filePath => generator.readAsset(join(outputPath, filePath)),
      noModuleFiles,
      moduleFiles,
      files,
    });
  };
}

function inlineFontsPlugin({ options }: IndexHtmlGenerator): IndexHtmlGeneratorPlugin {
  const inlineFontsProcessor = new InlineFontsProcessor({
    minifyInlinedCSS: !!options.optimization?.styles,
    WOFFSupportNeeded: options.WOFFSupportNeeded,
  });

  return async html => inlineFontsProcessor.process(html);
}

function postTransformPlugin({ options }: IndexHtmlGenerator): IndexHtmlGeneratorPlugin {
  return async html => options.postTransform ? options.postTransform(html) : html;
}
