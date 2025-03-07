/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { BuilderContext } from '@angular-devkit/architect';
import type { Plugin } from 'esbuild';
import type http from 'node:http';
import { checkPort } from '../../utils/check-port';
import {
  type IndexHtmlTransform,
  buildApplicationInternal,
  purgeStaleBuildCache,
} from './internal';
import { normalizeOptions } from './options';
import type { DevServerBuilderOutput } from './output';
import type { Schema as DevServerBuilderOptions } from './schema';
import { serveWithVite } from './vite-server';

/**
 * A Builder that executes a development server based on the provided browser target option.
 *
 * Usage of the `transforms` and/or `extensions` parameters is NOT supported and may cause
 * unexpected build output or build failures.
 *
 * @param options Dev Server options.
 * @param context The build context.
 * @param extensions An optional object containing an array of build plugins (esbuild-based)
 * and/or HTTP request middleware.
 *
 * @experimental Direct usage of this function is considered experimental.
 */
export async function* execute(
  options: DevServerBuilderOptions,
  context: BuilderContext,
  extensions?: {
    buildPlugins?: Plugin[];
    middleware?: ((
      req: http.IncomingMessage,
      res: http.ServerResponse,
      next: (err?: unknown) => void,
    ) => void)[];
    indexHtmlTransformer?: IndexHtmlTransform;
  },
): AsyncIterable<DevServerBuilderOutput> {
  // Determine project name from builder context target
  const projectName = context.target?.project;
  if (!projectName) {
    context.logger.error(`The "dev-server" builder requires a target to be specified.`);

    return;
  }

  const { builderName, normalizedOptions } = await initialize(options, projectName, context);

  yield* serveWithVite(
    normalizedOptions,
    builderName,
    (options, context, plugins) =>
      buildApplicationInternal(options, context, { codePlugins: plugins }),
    context,
    { indexHtml: extensions?.indexHtmlTransformer },
    extensions,
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
    !/^127\.\d+\.\d+\.\d+/g.test(normalizedOptions.host) &&
    normalizedOptions.host !== '::1' &&
    normalizedOptions.host !== 'localhost'
  ) {
    context.logger.warn(`
Warning: This is a simple server for use in testing or debugging Angular applications
locally. It hasn't been reviewed for security issues.

Binding this server to an open connection can result in compromising your application or
computer. Using a different host than the one passed to the "--host" flag might result in
websocket connection issues.
    `);
  }

  normalizedOptions.port = await checkPort(normalizedOptions.port, normalizedOptions.host);

  return {
    builderName,
    normalizedOptions,
  };
}
