/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { BuilderContext, BuilderOutput } from '@angular-devkit/architect';
import type { NgPackagrOptions } from 'ng-packagr';
import { join, resolve } from 'node:path';
import { assertIsError } from '../../utils/error';
import { normalizeCacheOptions } from '../../utils/normalize-cache';
import { purgeStaleBuildCache } from '../../utils/purge-cache';
import type { Schema as NgPackagrBuilderOptions } from './schema';

/**
 * A Builder that executes the `ng-packagr` tool to build an Angular library.
 *
 * @param options The builder options as defined by the JSON schema.
 * @param context A BuilderContext instance.
 * @returns A BuilderOutput object.
 *
 * @experimental Direct usage of this function is considered experimental.
 */
export async function* execute(
  options: NgPackagrBuilderOptions,
  context: BuilderContext,
): AsyncIterableIterator<BuilderOutput> {
  // Purge old build disk cache.
  await purgeStaleBuildCache(context);

  const root = context.workspaceRoot;
  let packager;
  try {
    packager = (await import('ng-packagr')).ngPackagr();
  } catch (error) {
    assertIsError(error);
    if (error.code === 'MODULE_NOT_FOUND') {
      return {
        success: false,
        error:
          'The "ng-packagr" package was not found. To correct this error, ensure this package is installed in the project.',
      };
    }

    throw error;
  }

  packager.forProject(resolve(root, options.project));

  if (options.tsConfig) {
    packager.withTsConfig(resolve(root, options.tsConfig));
  }

  const projectName = context.target?.project;
  if (!projectName) {
    throw new Error('The builder requires a target.');
  }

  const metadata = await context.getProjectMetadata(projectName);
  const { enabled: cacheEnabled, path: cacheDirectory } = normalizeCacheOptions(
    metadata,
    context.workspaceRoot,
  );

  const ngPackagrOptions: NgPackagrOptions = {
    cacheEnabled,
    poll: options.poll,
    cacheDirectory: join(cacheDirectory, 'ng-packagr'),
  };

  try {
    if (options.watch) {
      await packager.watch(ngPackagrOptions).toPromise();
    } else {
      await packager.build(ngPackagrOptions);
    }

    yield { success: true };
  } catch (error) {
    assertIsError(error);

    yield { success: false, error: error.message };
  }
}
