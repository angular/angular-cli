/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import Critters from 'critters';
import { readFile } from './utils';

export interface InlineCriticalCssProcessOptions {
  outputPath?: string;
}

export interface InlineCriticalCssProcessorOptions {
  minify?: boolean;
  deployUrl?: string;
}

class CrittersExtended extends Critters {
  readonly warnings: string[] = [];
  readonly errors: string[] = [];

  constructor(
    private readonly optionsExtended: InlineCriticalCssProcessorOptions & InlineCriticalCssProcessOptions,
    private readonly resourceCache: Map<string, string>,
  ) {
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
      // Cast any is needed because of logger API is not exposed as part of the options
      // https://github.com/GoogleChromeLabs/critters/issues/66
      // tslint:disable-next-line: no-any
    } as any);
  }

  protected async readFile(path: string): Promise<string> {
    let resourceContent = this.resourceCache.get(path);
    if (resourceContent === undefined) {
      resourceContent = await readFile(path, 'utf-8');
      this.resourceCache.set(path, resourceContent);
    }

    return resourceContent;
  }
}

export class InlineCriticalCssProcessor {
  private readonly resourceCache = new Map<string, string>();

  constructor(protected readonly options: InlineCriticalCssProcessorOptions) { }

  async process(html: string, options: InlineCriticalCssProcessOptions)
    : Promise<{ content: string, warnings: string[], errors: string[] }> {

    const critters = new CrittersExtended({ ...this.options, ...options }, this.resourceCache);
    const content = await critters.process(html);

    return {
      content,
      errors: critters.errors,
      warnings: critters.warnings,
    };
  }
}
