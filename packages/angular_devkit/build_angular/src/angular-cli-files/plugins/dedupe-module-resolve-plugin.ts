/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Compiler } from 'webpack';
import { addWarning } from '../../utils/webpack-diagnostics';

interface AfterResolveResult {
  request: string;
  resource: string;
  context: {
    issuer: string;
  };
  resourceResolveData: {
    relativePath: string;
    descriptionFileRoot: string;
    descriptionFilePath: string;
    descriptionFileData: {
      name?: string;
      version?: string;
    };
  };
}

export interface DedupeModuleResolvePluginOptions {
  verbose?: boolean;
}

/**
 * DedupeModuleResolvePlugin is a webpack plugin which dedupes modules with the same name and versions
 * that are laid out in different parts of the node_modules tree.
 *
 * This is needed because Webpack relies on package managers to hoist modules and doesn't have any deduping logic.
 *
 * This is similar to how Webpack's 'NormalModuleReplacementPlugin' works
 * @see https://github.com/webpack/webpack/blob/4a1f068828c2ab47537d8be30d542cd3a1076db4/lib/NormalModuleReplacementPlugin.js#L9
 */
export class DedupeModuleResolvePlugin {
  modules = new Map<string, { request: string, resource: string }>();

  constructor(private options?: DedupeModuleResolvePluginOptions) { }

  apply(compiler: Compiler) {
    compiler.hooks.compilation.tap('DedupeModuleResolvePlugin', (compilation, { normalModuleFactory }) => {
      normalModuleFactory.hooks.afterResolve.tap('DedupeModuleResolvePlugin', (result: AfterResolveResult | undefined) => {
        if (!result) {
          return;
        }

        const { resource, request, resourceResolveData } = result;
        const { descriptionFileData, relativePath } = resourceResolveData;

        // Empty name or versions are no valid primary  entrypoints of a library
        if (!descriptionFileData.name || !descriptionFileData.version) {
          return;
        }

        const moduleId = descriptionFileData.name + '@' + descriptionFileData.version + ':' + relativePath;
        const prevResolvedModule = this.modules.get(moduleId);

        if (!prevResolvedModule) {
          // This is the first time we visit this module.
          this.modules.set(moduleId, {
            resource,
            request,
          });

          return;
        }

        const { resource: prevResource, request: prevRequest } = prevResolvedModule;
        if (result.resource === prevResource) {
          // No deduping needed.
          // Current path and previously resolved path are the same.
          return;
        }

        if (this.options?.verbose) {
          addWarning(compilation, `[DedupeModuleResolvePlugin]: ${result.resource} -> ${prevResource}`);
        }

        // Alter current request with previously resolved module.
        result.request = prevRequest;
      });
    });
  }
}
