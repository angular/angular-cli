/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { DevServerBuilderOutput } from '@angular/build';
import { type IndexHtmlTransform, checkPort, purgeStaleBuildCache } from '@angular/build/private';
import type { BuilderContext } from '@angular-devkit/architect';
import type { Plugin } from 'esbuild';
import type http from 'node:http';
import { EMPTY, Observable, defer, switchMap } from 'rxjs';
import type { ExecutionTransformer } from '../../transforms';
import { normalizeOptions } from './options';
import type { Schema as DevServerBuilderOptions } from './schema';

/**
 * A Builder that executes a development server based on the provided browser target option.
 *
 * Usage of the `transforms` and/or `extensions` parameters is NOT supported and may cause
 * unexpected build output or build failures.
 *
 * @param options Dev Server options.
 * @param context The build context.
 * @param transforms A map of transforms that can be used to hook into some logic (such as
 * transforming webpack configuration before passing it to webpack).
 * @param extensions An optional object containing an array of build plugins (esbuild-based)
 * and/or HTTP request middleware.
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
  extensions?: {
    buildPlugins?: Plugin[];
    middleware?: ((
      req: http.IncomingMessage,
      res: http.ServerResponse,
      next: (err?: unknown) => void,
    ) => void)[];
    builderSelector?: (info: BuilderSelectorInfo, logger: BuilderContext['logger']) => string;
  },
): Observable<DevServerBuilderOutput> {
  // Determine project name from builder context target
  const projectName = context.target?.project;
  if (!projectName) {
    context.logger.error(`The "dev-server" builder requires a target to be specified.`);

    return EMPTY;
  }

  return defer(() => initialize(options, projectName, context, extensions?.builderSelector)).pipe(
    switchMap(({ builderName, normalizedOptions }) => {
      // Use vite-based development server for esbuild-based builds
      if (isEsbuildBased(builderName)) {
        if (transforms?.logging || transforms?.webpackConfiguration) {
          throw new Error(
            `The "application" and "browser-esbuild" builders do not support Webpack transforms.`,
          );
        }

        if (options.publicHost) {
          context.logger.warn(
            `The "publicHost" option will not be used because it is not supported by the "${builderName}" builder.`,
          );
        }

        if (options.disableHostCheck) {
          context.logger.warn(
            `The "disableHostCheck" option will not be used because it is not supported by the "${builderName}" builder.`,
          );
        }

        // New build system defaults hmr option to the value of liveReload
        normalizedOptions.hmr ??= normalizedOptions.liveReload;

        // New build system uses Vite's allowedHost option convention of true for disabling host checks
        if (normalizedOptions.disableHostCheck) {
          (normalizedOptions as unknown as { allowedHosts: true }).allowedHosts = true;
        } else {
          normalizedOptions.allowedHosts ??= [];
        }

        return defer(() =>
          Promise.all([import('@angular/build/private'), import('../browser-esbuild')]),
        ).pipe(
          switchMap(([{ serveWithVite, buildApplicationInternal }, { convertBrowserOptions }]) =>
            serveWithVite(
              normalizedOptions as typeof normalizedOptions & {
                hmr: boolean;
                allowedHosts: true | string[];
              },
              builderName,
              (options, context, codePlugins) => {
                return builderName === '@angular-devkit/build-angular:browser-esbuild'
                  ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    buildApplicationInternal(convertBrowserOptions(options as any), context, {
                      codePlugins,
                    })
                  : buildApplicationInternal(options, context, { codePlugins });
              },
              context,
              transforms,
              extensions,
            ),
          ),
        );
      }

      // Warn if the initial options provided by the user enable prebundling with Webpack-based builders
      if (options.prebundle) {
        context.logger.warn(
          `Prebundling has been configured but will not be used because it is not supported by the "${builderName}" builder.`,
        );
      }

      if (extensions?.buildPlugins?.length) {
        throw new Error('Only the "application" and "browser-esbuild" builders support plugins.');
      }
      if (extensions?.middleware?.length) {
        throw new Error(
          'Only the "application" and "browser-esbuild" builders support middleware.',
        );
      }

      // Webpack based build systems default to false for hmr option
      normalizedOptions.hmr ??= false;

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
  builderSelector = defaultBuilderSelector,
) {
  // Purge old build disk cache.
  await purgeStaleBuildCache(context);

  const normalizedOptions = await normalizeOptions(context, projectName, initialOptions);
  const builderName = builderSelector(
    {
      builderName: await context.getBuilderNameForTarget(normalizedOptions.buildTarget),
      forceEsbuild: !!normalizedOptions.forceEsbuild,
    },
    context.logger,
  );

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

  return {
    builderName,
    normalizedOptions,
  };
}

export function isEsbuildBased(
  builderName: string,
): builderName is
  | '@angular/build:application'
  | '@angular-devkit/build-angular:application'
  | '@angular-devkit/build-angular:browser-esbuild' {
  if (
    builderName === '@angular/build:application' ||
    builderName === '@angular-devkit/build-angular:application' ||
    builderName === '@angular-devkit/build-angular:browser-esbuild'
  ) {
    return true;
  }

  return false;
}

interface BuilderSelectorInfo {
  builderName: string;
  forceEsbuild: boolean;
}

function defaultBuilderSelector(
  info: BuilderSelectorInfo,
  logger: BuilderContext['logger'],
): string {
  if (isEsbuildBased(info.builderName)) {
    return info.builderName;
  }

  if (info.forceEsbuild) {
    if (!info.builderName.startsWith('@angular-devkit/build-angular:')) {
      logger.warn(
        'Warning: Forcing the use of the esbuild-based build system with third-party builders' +
          ' may cause unexpected behavior and/or build failures.',
      );
    }

    // The compatibility builder should be used if esbuild is force enabled.
    return '@angular-devkit/build-angular:browser-esbuild';
  }

  return info.builderName;
}
