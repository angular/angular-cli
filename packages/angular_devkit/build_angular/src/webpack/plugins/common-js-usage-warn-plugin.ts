/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { isAbsolute } from 'path';
import { Compilation, Compiler, Dependency, Module, NormalModule } from 'webpack';
import { addWarning } from '../../utils/webpack-diagnostics';

// Webpack doesn't export these so the deep imports can potentially break.
const CommonJsRequireDependency = require('webpack/lib/dependencies/CommonJsRequireDependency');
const AMDDefineDependency = require('webpack/lib/dependencies/AMDDefineDependency');

export interface CommonJsUsageWarnPluginOptions {
  /** A list of CommonJS packages that are allowed to be used without a warning. */
  allowedDependencies?: string[];
}

export class CommonJsUsageWarnPlugin {
  private shownWarnings = new Set<string>();
  private allowedDependencies: Set<string>;

  constructor(private options: CommonJsUsageWarnPluginOptions = {}) {
    this.allowedDependencies = new Set(this.options.allowedDependencies);
  }

  apply(compiler: Compiler) {
    compiler.hooks.compilation.tap('CommonJsUsageWarnPlugin', (compilation) => {
      compilation.hooks.finishModules.tap('CommonJsUsageWarnPlugin', (modules) => {
        const mainEntry = compilation.entries.get('main');
        if (!mainEntry) {
          return;
        }
        const mainModules = new Set(
          mainEntry.dependencies.map((dep) => compilation.moduleGraph.getModule(dep)),
        );

        for (const module of modules) {
          const { dependencies, rawRequest } = module as NormalModule;
          if (
            !rawRequest ||
            rawRequest.startsWith('.') ||
            isAbsolute(rawRequest) ||
            this.allowedDependencies.has(rawRequest) ||
            this.allowedDependencies.has(this.rawRequestToPackageName(rawRequest)) ||
            rawRequest.startsWith('@angular/common/locales/')
          ) {
            /**
             * Skip when:
             * - module is absolute or relative.
             * - module is allowed even if it's a CommonJS.
             * - module is a locale imported from '@angular/common'.
             */
            continue;
          }

          if (this.hasCommonJsDependencies(compilation, dependencies)) {
            // Dependency is CommonsJS or AMD.
            const issuer = getIssuer(compilation, module);
            // Check if it's parent issuer is also a CommonJS dependency.
            // In case it is skip as an warning will be show for the parent CommonJS dependency.
            const parentDependencies = getIssuer(compilation, issuer)?.dependencies;
            if (
              parentDependencies &&
              this.hasCommonJsDependencies(compilation, parentDependencies, true)
            ) {
              continue;
            }

            // Find the main issuer (entry-point).
            let mainIssuer = issuer;
            let nextIssuer = getIssuer(compilation, mainIssuer);
            while (nextIssuer) {
              mainIssuer = nextIssuer;
              nextIssuer = getIssuer(compilation, mainIssuer);
            }

            // Only show warnings for modules from main entrypoint.
            // And if the issuer request is not from 'webpack-dev-server', as 'webpack-dev-server'
            // will require CommonJS libraries for live reloading such as 'sockjs-node'.
            // tslint:disable-next-line: no-any
            if (mainIssuer && mainModules.has(mainIssuer)) {
              const warning =
                `${(issuer as NormalModule | null)?.userRequest} depends on '${rawRequest}'. ` +
                'CommonJS or AMD dependencies can cause optimization bailouts.\n' +
                'For more info see: https://angular.io/guide/build#configuring-commonjs-dependencies';

              // Avoid showing the same warning multiple times when in 'watch' mode.
              if (!this.shownWarnings.has(warning)) {
                addWarning(compilation, warning);
                this.shownWarnings.add(warning);
              }
            }
          }
        }
      });
    });
  }

  private hasCommonJsDependencies(
    compilation: Compilation,
    dependencies: Dependency[],
    checkParentModules = false,
  ): boolean {
    for (const dep of dependencies) {
      if (dep instanceof CommonJsRequireDependency || dep instanceof AMDDefineDependency) {
        return true;
      }

      if (checkParentModules) {
        const module = getWebpackModule(compilation, dep);
        if (module && this.hasCommonJsDependencies(compilation, module.dependencies)) {
          return true;
        }
      }
    }

    return false;
  }

  private rawRequestToPackageName(rawRequest: string): string {
    return rawRequest.startsWith('@')
      ? // Scoped request ex: @angular/common/locale/en -> @angular/common
        rawRequest.split('/', 2).join('/')
      : // Non-scoped request ex: lodash/isEmpty -> lodash
        rawRequest.split('/', 1)[0];
  }
}

function getIssuer(compilation: Compilation, module: Module | null): Module | null {
  if (!module) {
    return null;
  }

  return compilation.moduleGraph.getIssuer(module);
}

function getWebpackModule(compilation: Compilation, dependency: Dependency | null): Module | null {
  if (!dependency) {
    return null;
  }

  return compilation.moduleGraph.getModule(dependency);
}
