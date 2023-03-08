/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderContext, BuilderOutput } from '@angular-devkit/architect';
import { EMPTY, Observable, defer, switchMap } from 'rxjs';
import { ExecutionTransformer } from '../../transforms';
import { checkPort } from '../../utils/check-port';
import { IndexHtmlTransform } from '../../utils/index-file/index-html-generator';
import { purgeStaleBuildCache } from '../../utils/purge-cache';
import { normalizeOptions } from './options';
import { Schema as DevServerBuilderOptions } from './schema';
import { DevServerBuilderOutput, serveWebpackBrowser } from './webpack-server';

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
): Observable<DevServerBuilderOutput> {
  // Determine project name from builder context target
  const projectName = context.target?.project;
  if (!projectName) {
    context.logger.error(`The 'dev-server' builder requires a target to be specified.`);

    return EMPTY;
  }

  return defer(() => initialize(options, projectName, context)).pipe(
    switchMap(({ builderName, normalizedOptions }) => {
      // Issue a warning that the dev-server does not currently support the experimental esbuild-
      // based builder and will use Webpack.
      if (builderName === '@angular-devkit/build-angular:browser-esbuild') {
        context.logger.warn(
          'WARNING: The experimental esbuild-based builder is not currently supported ' +
            'by the dev-server. The stable Webpack-based builder will be used instead.',
        );
      }

      return serveWebpackBrowser(normalizedOptions, builderName, context, transforms);
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
  const builderName = await context.getBuilderNameForTarget(normalizedOptions.browserTarget);

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

  normalizedOptions.port = await checkPort(normalizedOptions.port, normalizedOptions.host);

  return { builderName, normalizedOptions };
}
