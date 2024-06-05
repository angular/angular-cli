/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { purgeStaleBuildCache } from '@angular/build/private';
import { BuilderContext, BuilderOutput, createBuilder } from '@angular-devkit/architect';
import type { NgPackagrOptions } from 'ng-packagr';
import { join, resolve } from 'node:path';
import { Observable, catchError, from, map, of, switchMap } from 'rxjs';
import { normalizeCacheOptions } from '../../utils/normalize-cache';
import { Schema as NgPackagrBuilderOptions } from './schema';

/**
 * @experimental Direct usage of this function is considered experimental.
 */
export function execute(
  options: NgPackagrBuilderOptions,
  context: BuilderContext,
): Observable<BuilderOutput> {
  return from(
    (async () => {
      // Purge old build disk cache.
      await purgeStaleBuildCache(context);

      const root = context.workspaceRoot;
      const packager = (await import('ng-packagr')).ngPackagr();

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

      return { packager, ngPackagrOptions };
    })(),
  ).pipe(
    switchMap(({ packager, ngPackagrOptions }) =>
      options.watch ? packager.watch(ngPackagrOptions) : packager.build(ngPackagrOptions),
    ),
    map(() => ({ success: true })),
    catchError((err) => of({ success: false, error: err.message })),
  );
}

export { NgPackagrBuilderOptions };
export default createBuilder<Record<string, string> & NgPackagrBuilderOptions>(execute);
