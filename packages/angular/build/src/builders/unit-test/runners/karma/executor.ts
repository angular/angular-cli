/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { BuilderContext, BuilderOutput } from '@angular-devkit/architect';
import type { ApplicationBuilderInternalOptions } from '../../../application/options';
import type { KarmaBuilderOptions, KarmaBuilderTransformsOptions } from '../../../karma';
import { NormalizedUnitTestBuilderOptions } from '../../options';
import type { TestExecutor } from '../api';

export class KarmaExecutor implements TestExecutor {
  constructor(
    private context: BuilderContext,
    private options: NormalizedUnitTestBuilderOptions,
  ) {}

  async *execute(): AsyncIterable<BuilderOutput> {
    const { context, options: unitTestOptions } = this;

    if (unitTestOptions.debug) {
      context.logger.warn(
        'The "karma" test runner does not support the "debug" option. The option will be ignored.',
      );
    }

    if (unitTestOptions.setupFiles.length) {
      context.logger.warn(
        'The "karma" test runner does not support the "setupFiles" option. The option will be ignored.',
      );
    }

    const buildTargetOptions = (await context.validateOptions(
      await context.getTargetOptions(unitTestOptions.buildTarget),
      await context.getBuilderNameForTarget(unitTestOptions.buildTarget),
    )) as unknown as ApplicationBuilderInternalOptions;

    const karmaOptions: KarmaBuilderOptions = {
      tsConfig: unitTestOptions.tsConfig ?? buildTargetOptions.tsConfig,
      polyfills: buildTargetOptions.polyfills,
      assets: buildTargetOptions.assets,
      scripts: buildTargetOptions.scripts,
      styles: buildTargetOptions.styles,
      inlineStyleLanguage: buildTargetOptions.inlineStyleLanguage,
      stylePreprocessorOptions: buildTargetOptions.stylePreprocessorOptions,
      externalDependencies: buildTargetOptions.externalDependencies,
      loader: buildTargetOptions.loader,
      define: buildTargetOptions.define,
      include: unitTestOptions.include,
      exclude: unitTestOptions.exclude,
      sourceMap: buildTargetOptions.sourceMap,
      progress: unitTestOptions.buildProgress ?? buildTargetOptions.progress,
      watch: unitTestOptions.watch,
      poll: buildTargetOptions.poll,
      preserveSymlinks: buildTargetOptions.preserveSymlinks,
      browsers: unitTestOptions.browsers?.join(','),
      codeCoverage: !!unitTestOptions.codeCoverage,
      codeCoverageExclude: unitTestOptions.codeCoverage?.exclude,
      fileReplacements: buildTargetOptions.fileReplacements,
      reporters: unitTestOptions.reporters?.map((reporter) => {
        // Karma only supports string reporters.
        if (Object.keys(reporter[1]).length > 0) {
          context.logger.warn(
            `The "karma" test runner does not support options for the "${reporter[0]}" reporter. The options will be ignored.`,
          );
        }

        return reporter[0];
      }),
      webWorkerTsConfig: buildTargetOptions.webWorkerTsConfig,
      aot: buildTargetOptions.aot,
    };

    const transformOptions = {
      karmaOptions: (options) => {
        if (unitTestOptions.filter) {
          let filter = unitTestOptions.filter;
          if (filter[0] === '/' && filter.at(-1) === '/') {
            this.context.logger.warn(
              'The `--filter` option is always a regular expression.' +
                'Leading and trailing `/` are not required and will be ignored.',
            );
          } else {
            filter = `/${filter}/`;
          }

          options.client ??= {};
          options.client.args ??= [];
          options.client.args.push('--grep', filter);
        }

        return options;
      },
    } satisfies KarmaBuilderTransformsOptions;

    const { execute } = await import('../../../karma');

    yield* execute(karmaOptions, context, transformOptions);
  }

  async [Symbol.asyncDispose](): Promise<void> {
    // The Karma builder handles its own teardown
  }
}
