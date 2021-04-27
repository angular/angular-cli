/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { readFile } from '../fs';

const Critters: typeof import('critters').default = require('critters');

export interface InlineCriticalCssProcessOptions {
  outputPath: string;
}

export interface InlineCriticalCssProcessorOptions {
  minify?: boolean;
  deployUrl?: string;
  readAsset?: (path: string) => Promise<string>;
}
class CrittersExtended extends Critters {
  readonly warnings: string[] = [];
  readonly errors: string[] = [];

  constructor(private readonly optionsExtended: InlineCriticalCssProcessorOptions & InlineCriticalCssProcessOptions) {
    super({
      logger: {
        warn: (s: string) => this.warnings.push(s),
        error: (s: string) => this.errors.push(s),
        log: () => { },
        info: () => { },
      },
      path: optionsExtended.outputPath,
      publicPath: optionsExtended.deployUrl,
      compress: !!optionsExtended.minify,
      pruneSource: false,
      reduceInlineStyles: false,
      mergeStylesheets: false,
      preload: 'media',
      noscriptFallback: true,
      inlineFonts: true,
      // tslint:disable-next-line: no-any
    } as any);
  }

  protected readFile(path: string): Promise<string> {
    const readAsset = this.optionsExtended.readAsset;

    return readAsset ? readAsset(path) : readFile(path, 'utf-8');
  }
}

export class InlineCriticalCssProcessor {
  constructor(protected readonly options: InlineCriticalCssProcessorOptions) { }

  async process(html: string, options: InlineCriticalCssProcessOptions)
    : Promise<{ content: string, warnings: string[], errors: string[] }> {
    const critters = new CrittersExtended({ ...this.options, ...options });
    const content = await critters.process(html);

    return {
      // Clean up value from value less attributes.
      // This is caused because parse5 always requires attributes to have a string value.
      // nomodule="" defer="" -> nomodule defer.
      content: content.replace(/(\s(?:defer|nomodule))=""/g, '$1'),
      errors: critters.errors,
      warnings: critters.warnings,
    };
  }
}
