/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { BuilderContext, BuilderOutput } from '@angular-devkit/architect';
import type { ApplicationBuilderInternalOptions } from '../application/options';
import type { KarmaBuilderOptions } from '../karma';
import type { NormalizedUnitTestOptions } from './options';

export async function useKarmaBuilder(
  context: BuilderContext,
  unitTestOptions: NormalizedUnitTestOptions,
): Promise<AsyncIterable<BuilderOutput>> {
  const buildTargetOptions = (await context.validateOptions(
    await context.getTargetOptions(unitTestOptions.buildTarget),
    await context.getBuilderNameForTarget(unitTestOptions.buildTarget),
  )) as unknown as ApplicationBuilderInternalOptions;

  const options: KarmaBuilderOptions = {
    tsConfig: unitTestOptions.tsConfig,
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
    progress: buildTargetOptions.progress,
    watch: unitTestOptions.watch,
    poll: buildTargetOptions.poll,
    preserveSymlinks: buildTargetOptions.preserveSymlinks,
    browsers: unitTestOptions.browsers?.join(','),
    codeCoverage: unitTestOptions.codeCoverage,
    codeCoverageExclude: unitTestOptions.codeCoverageExclude,
    fileReplacements: buildTargetOptions.fileReplacements,
    reporters: unitTestOptions.reporters,
    webWorkerTsConfig: buildTargetOptions.webWorkerTsConfig,
    aot: buildTargetOptions.aot,
  };

  const { execute } = await import('../karma');

  return execute(options, context);
}
