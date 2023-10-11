/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { BuilderContext } from '@angular-devkit/architect';
import type { Plugin } from 'esbuild';
import { EMPTY, Observable, defer, switchMap } from 'rxjs';
import type { ExecutionTransformer } from '../../transforms';
import { checkPort } from '../../utils/check-port';
import type { IndexHtmlTransform } from '../../utils/index-file/index-html-generator';
import { purgeStaleBuildCache } from '../../utils/purge-cache';
import { normalizeOptions } from './options';
import type { Schema as DevServerBuilderOptions } from './schema';
import type { DevServerBuilderOutput } from './webpack-server';

/**
 * A Builder that executes a development server based on the provided browser target option.
 * @param options Dev Server options.
 * @param context The build context.
 * @param transforms A map of transforms that can be used to hook into some logic (such as
 * transforming webpack configuration before passing it to webpack).
 *
 * @experimental Direct usage of this function is considered experimental.
 */
export function execute(
  options: DevServerBuilderOptions,
  context: BuilderContext,
  transforms: {
    webpackConfiguration?: ExecutionTransformer<import('webpack').Configuration>;
    logging?: import('@angular-devkit/build-webpack').WebpackLoggingCallback;
    indexHtml?: IndexHtmlTransform;
  } = {},
  plugins?: Plugin[],
): Observable<DevServerBuilderOutput> {
  // Determine project name from builder context target
  const projectName = context.target?.project;
  if (!projectName) {
    context.logger.error(`The 'dev-server' builder requires a target to be specified.`);

    return EMPTY;
  }

  return defer(() => initialize(options, projectName, context)).pipe(
    switchMap(({ builderName, normalizedOptions }) => {
      // Use vite-based development server for esbuild-based builds
      if (
        builderName === '@angular-devkit/build-angular:application' ||
        builderName === '@angular-devkit/build-angular:browser-esbuild' ||
        normalizedOptions.forceEsbuild
      ) {
        if (Object.keys(transforms).length > 0) {
          throw new Error(
            'The `application` and `browser-esbuild` builders do not support Webpack transforms.',
          );
        }

        return defer(() => import('./vite-server')).pipe(
          switchMap(({ serveWithVite }) =>
            serveWithVite(normalizedOptions, builderName, context, plugins),
          ),
        );
      }

      if (plugins?.length) {
        throw new Error('Only the `application` and `browser-esbuild` builders support plugins.');
      }

      // Use Webpack for all other browser targets
      return defer(() => import('./webpack-server')).pipe(
        switchMap(({ serveWebpackBrowser }) =>
          serveWebpackBrowser(normalizedOptions, builderName, context, transforms),
        ),
      );
    }),
  );
}

async function initialize(
  initialOptions: DevServerBuilderOptions,
  projectName: string,
  context: BuilderContext,
) {
  // Purge old build disk cache.
  await purgeStaleBuildCache(context);

  const normalizedOptions = await normalizeOptions(context, projectName, initialOptions);
  const builderName = await context.getBuilderNameForTarget(normalizedOptions.buildTarget);

  if (
    !normalizedOptions.disableHostCheck &&
    !/^127\.\d+\.\d+\.\d+/g.test(normalizedOptions.host) &&
    normalizedOptions.host !== 'localhost'
  ) {
    context.logger.warn(`
Warning: This is a simple server for use in testing or debugging Angular applications
locally. It hasn't been reviewed for security issues.

Binding this server to an open connection can result in compromising your application or
computer. Using a different host than the one passed to the "--host" flag might result in
websocket connection issues. You might need to use "--disable-host-check" if that's the
case.
    `);
  }

  if (normalizedOptions.disableHostCheck) {
    context.logger.warn(
      'Warning: Running a server with --disable-host-check is a security risk. ' +
        'See https://medium.com/webpack/webpack-dev-server-middleware-security-issues-1489d950874a for more information.',
    );
  }

  if (normalizedOptions.forceEsbuild && !builderName.startsWith('@angular-devkit/build-angular:')) {
    context.logger.warn(
      'Warning: Forcing the use of the esbuild-based build system with third-party builders' +
        ' may cause unexpected behavior and/or build failures.',
    );
  }

  normalizedOptions.port = await checkPort(normalizedOptions.port, normalizedOptions.host);

  return { builderName, normalizedOptions };
}
