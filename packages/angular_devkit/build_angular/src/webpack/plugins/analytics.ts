/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { analytics } from '@angular-devkit/core';
import {
  Compilation,
  Compiler,
  Module,
  Stats,
} from 'webpack';
import { OriginalSource } from 'webpack-sources';

const NormalModule = require('webpack/lib/NormalModule');

interface NormalModule extends Module {
  _source?: OriginalSource | null;
  resource?: string;
}

const webpackAllErrorMessageRe = /^([^(]+)\(\d+,\d\): (.*)$/gm;
const webpackTsErrorMessageRe = /^[^(]+\(\d+,\d\): error (TS\d+):/;

/**
 * Faster than using a RegExp, so we use this to count occurences in source code.
 * @param source The source to look into.
 * @param match The match string to look for.
 * @param wordBreak Whether to check for word break before and after a match was found.
 * @return The number of matches found.
 * @private
 */
export function countOccurrences(source: string, match: string, wordBreak = false): number {
  if (match.length == 0) {
    return source.length + 1;
  }

  let count = 0;
  // We condition here so branch prediction happens out of the loop, not in it.
  if (wordBreak) {
    const re = /\w/;
    for (let pos = source.lastIndexOf(match); pos >= 0; pos = source.lastIndexOf(match, pos)) {
      if (!(re.test(source[pos - 1] || '') || re.test(source[pos + match.length] || ''))) {
        count++;  // 1 match, AH! AH! AH! 2 matches, AH! AH! AH!
      }

      pos -= match.length;
      if (pos < 0) {
        break;
      }
    }
  } else {
    for (let pos = source.lastIndexOf(match); pos >= 0; pos = source.lastIndexOf(match, pos)) {
      count++;  // 1 match, AH! AH! AH! 2 matches, AH! AH! AH!
      pos -= match.length;
      if (pos < 0) {
        break;
      }
    }
  }

  return count;
}


/**
 * Holder of statistics related to the build.
 */
class AnalyticsBuildStats {
  public errors: string[] = [];
  public numberOfNgOnInit = 0;
  public numberOfComponents = 0;
  public initialChunkSize = 0;
  public totalChunkCount = 0;
  public totalChunkSize = 0;
  public lazyChunkCount = 0;
  public lazyChunkSize = 0;
  public assetCount = 0;
  public assetSize = 0;
  public polyfillSize = 0;
  public cssSize = 0;
}


/**
 * Analytics plugin that reports the analytics we want from the CLI.
 */
export class NgBuildAnalyticsPlugin {
  protected _built = false;
  protected _stats = new AnalyticsBuildStats();

  constructor(
    protected _projectRoot: string,
    protected _analytics: analytics.Analytics,
    protected _category: string,
    private _isIvy: boolean,
  ) {
  }

  protected _reset() {
    this._stats = new AnalyticsBuildStats();
  }

  protected _getMetrics(stats: Stats) {
    const startTime = +(stats.startTime || 0);
    const endTime = +(stats.endTime || 0);
    const metrics: (string | number)[] = [];
    metrics[analytics.NgCliAnalyticsMetrics.BuildTime] = (endTime - startTime);
    metrics[analytics.NgCliAnalyticsMetrics.NgOnInitCount] = this._stats.numberOfNgOnInit;
    metrics[analytics.NgCliAnalyticsMetrics.NgComponentCount] = this._stats.numberOfComponents;
    metrics[analytics.NgCliAnalyticsMetrics.InitialChunkSize] = this._stats.initialChunkSize;
    metrics[analytics.NgCliAnalyticsMetrics.TotalChunkCount] = this._stats.totalChunkCount;
    metrics[analytics.NgCliAnalyticsMetrics.TotalChunkSize] = this._stats.totalChunkSize;
    metrics[analytics.NgCliAnalyticsMetrics.LazyChunkCount] = this._stats.lazyChunkCount;
    metrics[analytics.NgCliAnalyticsMetrics.LazyChunkSize] = this._stats.lazyChunkSize;
    metrics[analytics.NgCliAnalyticsMetrics.AssetCount] = this._stats.assetCount;
    metrics[analytics.NgCliAnalyticsMetrics.AssetSize] = this._stats.assetSize;
    metrics[analytics.NgCliAnalyticsMetrics.PolyfillSize] = this._stats.polyfillSize;
    metrics[analytics.NgCliAnalyticsMetrics.CssSize] = this._stats.cssSize;

    return metrics;
  }
  protected _getDimensions() {
    const dimensions: (string | number | boolean)[] = [];

    if (this._stats.errors.length) {
      // Adding commas before and after so the regex are easier to define filters.
      dimensions[analytics.NgCliAnalyticsDimensions.BuildErrors] = `,${this._stats.errors.join()},`;
    }

    dimensions[analytics.NgCliAnalyticsDimensions.NgIvyEnabled] = this._isIvy;

    return dimensions;
  }

  protected _reportBuildMetrics(stats: Stats) {
    const dimensions = this._getDimensions();
    const metrics = this._getMetrics(stats);
    this._analytics.event(this._category, 'build', { dimensions, metrics });
  }

  protected _reportRebuildMetrics(stats: Stats) {
    const dimensions = this._getDimensions();
    const metrics = this._getMetrics(stats);
    this._analytics.event(this._category, 'rebuild', { dimensions, metrics });
  }

  protected _checkTsNormalModule(module: NormalModule) {
    if (module._source) {
      // PLEASE REMEMBER:
      // We're dealing with ES5 _or_ ES2015 JavaScript at this point (we don't know for sure).

      // Just count the ngOnInit occurences. Comments/Strings/calls occurences should be sparse
      // so we just consider them within the margin of error. We do break on word break though.
      this._stats.numberOfNgOnInit += countOccurrences(module._source.source(), 'ngOnInit', true);

      // Count the number of `Component({` strings (case sensitive), which happens in __decorate().
      this._stats.numberOfComponents += countOccurrences(module._source.source(), 'Component({');
      // For Ivy we just count ɵcmp.
      this._stats.numberOfComponents += countOccurrences(module._source.source(), '.ɵcmp', true);
      // for ascii_only true
      this._stats.numberOfComponents += countOccurrences(module._source.source(), '.\u0275cmp', true);
    }
  }

  protected _collectErrors(stats: Stats) {
    if (stats.hasErrors()) {
      for (const errObject of stats.compilation.errors) {
        if (errObject instanceof Error) {
          const allErrors = errObject.message.match(webpackAllErrorMessageRe);
          for (const err of [...allErrors || []].slice(1)) {
            const message = (err.match(webpackTsErrorMessageRe) || [])[1];
            if (message) {
              // At this point this should be a TS1234.
              this._stats.errors.push(message);
            }
          }
        }
      }
    }
  }

  protected _collectBundleStats(compilation: Compilation) {
    const chunkAssets = new Set<string>();
    for (const chunk of compilation.chunks) {
      if (!chunk.rendered) {
        continue;
      }

      const firstFile = Array.from(chunk.files)[0];
      const size = compilation.getAsset(firstFile)?.source.size() ?? 0;
      chunkAssets.add(firstFile);

      if (chunk.canBeInitial()) {
        this._stats.initialChunkSize += size;
      } else {
        this._stats.lazyChunkCount++;
        this._stats.lazyChunkSize += size;
      }

      this._stats.totalChunkCount++;
      this._stats.totalChunkSize += size;

      if (firstFile.endsWith('.css')) {
        this._stats.cssSize += size;
      }
    }

    for (const asset of compilation.getAssets()) {
      // Only count non-JavaScript related files
      if (chunkAssets.has(asset.name)) {
        continue;
      }

      this._stats.assetSize += asset.source.size();
      this._stats.assetCount++;

      if (asset.name == 'polyfill') {
        this._stats.polyfillSize += asset.source.size();
      }
    }
  }

  /************************************************************************************************
   * The next section is all the different Webpack hooks for this plugin.
   */

  /**
   * Reports a succeed module.
   * @private
   */
  protected _succeedModule(mod: Module) {
    // Only report NormalModule instances.
    if (mod.constructor !== NormalModule) {
      return;
    }
    const module = mod as {} as NormalModule;

    // Only reports modules that are part of the user's project. We also don't do node_modules.
    // There is a chance that someone name a file path `hello_node_modules` or something and we
    // will ignore that file for the purpose of gathering, but we're willing to take the risk.
    if (!module.resource
        || !module.resource.startsWith(this._projectRoot)
        || module.resource.indexOf('node_modules') >= 0) {
      return;
    }

    // Check that it's a source file from the project.
    if (module.resource.endsWith('.ts')) {
      this._checkTsNormalModule(module);
    }
  }

  protected _compilation(compiler: Compiler, compilation: Compilation) {
    this._reset();
    compilation.hooks.succeedModule.tap('NgBuildAnalyticsPlugin', this._succeedModule.bind(this));
  }

  protected _done(stats: Stats) {
    this._collectErrors(stats);
    this._collectBundleStats(stats.compilation);
    if (this._built) {
      this._reportRebuildMetrics(stats);
    } else {
      this._reportBuildMetrics(stats);
      this._built = true;
    }
  }

  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap(
      'NgBuildAnalyticsPlugin',
      this._compilation.bind(this, compiler),
    );
    compiler.hooks.done.tap('NgBuildAnalyticsPlugin', this._done.bind(this));
  }
}
