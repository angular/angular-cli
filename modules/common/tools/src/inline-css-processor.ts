/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import Critters from 'critters';
import * as fs from 'fs';

export interface InlineCriticalCssProcessOptions {
  outputPath?: string;
}

export interface InlineCriticalCssProcessorOptions {
  minify?: boolean;
  deployUrl?: string;
}

export interface InlineCriticalCssResult {
  content: string;
  warnings?: string[];
  errors?: string[];
}

class CrittersExtended extends Critters {
  readonly warnings: string[] = [];
  readonly errors: string[] = [];

  constructor(
    private readonly optionsExtended: InlineCriticalCssProcessorOptions &
      InlineCriticalCssProcessOptions,
    private readonly resourceCache: Map<string, string>,
  ) {
    super({
      logger: {
        warn: (s: string) => this.warnings.push(s),
        error: (s: string) => this.errors.push(s),
        info: () => {},
      },
      logLevel: 'warn',
      path: optionsExtended.outputPath,
      publicPath: optionsExtended.deployUrl,
      compress: !!optionsExtended.minify,
      pruneSource: false,
      reduceInlineStyles: false,
      mergeStylesheets: false,
      preload: 'media',
      noscriptFallback: true,
      inlineFonts: true,
    });
  }

  public override async readFile(path: string): Promise<string> {
    let resourceContent = this.resourceCache.get(path);
    if (resourceContent === undefined) {
      resourceContent = await fs.promises.readFile(path, 'utf-8');
      this.resourceCache.set(path, resourceContent);
    }

    return resourceContent;
  }
}

export class InlineCriticalCssProcessor {
  private readonly resourceCache = new Map<string, string>();

  constructor(protected readonly options: InlineCriticalCssProcessorOptions) {}

  async process(
    html: string,
    options: InlineCriticalCssProcessOptions,
  ): Promise<InlineCriticalCssResult> {
    const critters = new CrittersExtended({ ...this.options, ...options }, this.resourceCache);
    const content = await critters.process(html);

    return {
      content,
      errors: critters.errors.length ? critters.errors : undefined,
      warnings: critters.warnings.length ? critters.warnings : undefined,
    };
  }
}
