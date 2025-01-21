/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  BuilderContext,
  BuilderOutput,
  createBuilder,
  targetFromTargetString,
} from '@angular-devkit/architect';
import { tags } from '@angular-devkit/core';
import { resolve } from 'path';
import * as url from 'url';
import { runModuleAsObservableFork } from '../../utils';
import { assertIsError } from '../../utils/error';
import { DevServerBuilderOptions } from '../dev-server/index';
import { Schema as ProtractorBuilderOptions } from './schema';

interface JasmineNodeOpts {
  jasmineNodeOpts: {
    grep?: string;
    invertGrep?: boolean;
  };
}

function runProtractor(root: string, options: ProtractorBuilderOptions): Promise<BuilderOutput> {
  const additionalProtractorConfig: Partial<ProtractorBuilderOptions> & Partial<JasmineNodeOpts> = {
    baseUrl: options.baseUrl,
    specs: options.specs && options.specs.length ? options.specs : undefined,
    suite: options.suite,
    jasmineNodeOpts: {
      grep: options.grep,
      invertGrep: options.invertGrep,
    },
  };

  // TODO: Protractor manages process.exit itself, so this target will allways quit the
  // process. To work around this we run it in a subprocess.
  // https://github.com/angular/protractor/issues/4160
  return runModuleAsObservableFork(root, 'protractor/built/launcher', 'init', [
    resolve(root, options.protractorConfig),
    additionalProtractorConfig,
  ]).toPromise() as Promise<BuilderOutput>;
}

async function updateWebdriver() {
  // The webdriver-manager update command can only be accessed via a deep import.
  const webdriverDeepImport = 'webdriver-manager/built/lib/cmds/update';

  let path;
  try {
    const protractorPath = require.resolve('protractor');

    path = require.resolve(webdriverDeepImport, { paths: [protractorPath] });
  } catch (error) {
    assertIsError(error);
    if (error.code !== 'MODULE_NOT_FOUND') {
      throw error;
    }
  }

  if (!path) {
    throw new Error(tags.stripIndents`
      Cannot automatically find webdriver-manager to update.
      Update webdriver-manager manually and run 'ng e2e --no-webdriver-update' instead.
    `);
  }

  const webdriverUpdate = await import(path);
  // const webdriverUpdate = await import(path) as typeof import ('webdriver-manager/built/lib/cmds/update');

  // run `webdriver-manager update --standalone false --gecko false --quiet`
  // if you change this, update the command comment in prev line
  return webdriverUpdate.program.run({
    standalone: false,
    gecko: false,
    quiet: true,
  } as unknown as JSON);
}

export type { ProtractorBuilderOptions };

/**
 * @experimental Direct usage of this function is considered experimental.
 */
export async function execute(
  options: ProtractorBuilderOptions,
  context: BuilderContext,
): Promise<BuilderOutput> {
  context.logger.warn(
    'Protractor has reached end-of-life and is no longer supported by the Angular team. The `protractor` builder will be removed in a future Angular major version. For additional information and alternatives, please see https://blog.angular.dev/protractor-deprecation-update-august-2023-2beac7402ce0.',
  );

  // ensure that only one of these options is used
  if (options.devServerTarget && options.baseUrl) {
    throw new Error(tags.stripIndents`
    The 'baseUrl' option cannot be used with 'devServerTarget'.
    When present, 'devServerTarget' will be used to automatically setup 'baseUrl' for Protractor.
    `);
  }

  if (options.webdriverUpdate) {
    await updateWebdriver();
  }

  let baseUrl = options.baseUrl;
  let server;

  try {
    if (options.devServerTarget) {
      const target = targetFromTargetString(options.devServerTarget);
      const serverOptions = await context.getTargetOptions(target);

      const overrides = {
        watch: false,
        liveReload: false,
      } as DevServerBuilderOptions;

      if (options.host !== undefined) {
        overrides.host = options.host;
      } else if (typeof serverOptions.host === 'string') {
        options.host = serverOptions.host;
      } else {
        options.host = overrides.host = 'localhost';
      }

      if (options.port !== undefined) {
        overrides.port = options.port;
      } else if (typeof serverOptions.port === 'number') {
        options.port = serverOptions.port;
      }

      server = await context.scheduleTarget(target, overrides);
      const result = await server.result;
      if (!result.success) {
        return { success: false };
      }

      if (typeof serverOptions.publicHost === 'string') {
        let publicHost = serverOptions.publicHost;
        if (!/^\w+:\/\//.test(publicHost)) {
          publicHost = `${serverOptions.ssl ? 'https' : 'http'}://${publicHost}`;
        }
        const clientUrl = url.parse(publicHost);
        baseUrl = url.format(clientUrl);
      } else if (typeof result.baseUrl === 'string') {
        baseUrl = result.baseUrl;
      } else if (typeof result.port === 'number') {
        baseUrl = url.format({
          protocol: serverOptions.ssl ? 'https' : 'http',
          hostname: options.host,
          port: result.port.toString(),
        });
      }
    }

    // Like the baseUrl in protractor config file when using the API we need to add
    // a trailing slash when provide to the baseUrl.
    if (baseUrl && !baseUrl.endsWith('/')) {
      baseUrl += '/';
    }

    return await runProtractor(context.workspaceRoot, { ...options, baseUrl });
  } catch {
    return { success: false };
  } finally {
    await server?.stop();
  }
}

export default createBuilder<ProtractorBuilderOptions>(execute);
