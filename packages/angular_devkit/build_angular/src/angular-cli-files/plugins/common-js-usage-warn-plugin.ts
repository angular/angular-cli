
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { isAbsolute } from 'path';
import { Compiler, compilation } from 'webpack';

// Webpack doesn't export these so the deep imports can potentially break.
const CommonJsRequireDependency = require('webpack/lib/dependencies/CommonJsRequireDependency');
const AMDDefineDependency = require('webpack/lib/dependencies/AMDDefineDependency');

// The below is extended because there are not in the typings
interface WebpackModule extends compilation.Module {
  name?: string;
  rawRequest?: string;
  dependencies: unknown[];
  issuer: WebpackModule | null;
  userRequest?: string;
}

export interface CommonJsUsageWarnPluginOptions {
  /** A list of CommonJS packages that are allowed to be used without a warning. */
  allowedDepedencies?: string[];
}

export class CommonJsUsageWarnPlugin {
  private shownWarnings = new Set<string>();

  // Allow the below depedency for HMR
  // tslint:disable-next-line: max-line-length
  // https://github.com/angular/angular-cli/blob/1e258317b1f6ec1e957ee3559cc3b28ba602f3ba/packages/angular_devkit/build_angular/src/dev-server/index.ts#L605-L638
  private allowedDepedencies = new Set<string>(['webpack/hot/dev-server']);

  constructor(private options: CommonJsUsageWarnPluginOptions = {}) {
    this.options.allowedDepedencies?.forEach(d => this.allowedDepedencies.add(d));
  }

  apply(compiler: Compiler) {
    compiler.hooks.compilation.tap('CommonJsUsageWarnPlugin', compilation => {
      compilation.hooks.finishModules.tap('CommonJsUsageWarnPlugin', modules => {
        for (const { dependencies, rawRequest, issuer } of modules as unknown as WebpackModule[]) {
          if (
            !rawRequest ||
            rawRequest.startsWith('.') ||
            isAbsolute(rawRequest)
          ) {
            // Skip if module is absolute or relative.
            continue;
          }

          if (
            this.allowedDepedencies.has(rawRequest) ||
            this.allowedDepedencies.has(this.rawRequestToPackageName(rawRequest))
          ) {
            // Skip as this module is allowed even if it's a CommonJS.
            continue;
          }

          if (this.hasCommonJsDependencies(dependencies)) {
            // Dependency is CommonsJS or AMD.

            // Check if it's parent issuer is also a CommonJS dependency.
            // In case it is skip as an warning will be show for the parent CommonJS dependency.
            const parentDependencies = issuer?.issuer?.dependencies;
            if (parentDependencies && this.hasCommonJsDependencies(parentDependencies)) {
              continue;
            }

            // Find the main issuer (entry-point).
            let mainIssuer = issuer;
            while (mainIssuer?.issuer) {
              mainIssuer = mainIssuer.issuer;
            }

            // Only show warnings for modules from main entrypoint.
            // And if the issuer request is not from 'webpack-dev-server', as 'webpack-dev-server'
            // will require CommonJS libraries for live reloading such as 'sockjs-node'.
            if (mainIssuer?.name === 'main' && !issuer?.userRequest?.includes('webpack-dev-server')) {
              let warning = `${issuer?.userRequest} depends on '${rawRequest}'.`;

              if (rawRequest.startsWith('@angular/common/locales')) {
                warning += `\nWhen using the 'localize' option this import is not needed. ` +
                  `Did you mean to import '${rawRequest.replace(/locales(\/extra)?\//, 'locales/global/')}'?\n` +
                  'For more info see: https://angular.io/guide/i18n#import-global-variants-of-the-locale-data';
              } else {
                warning += ' CommonJS or AMD dependencies can cause optimization bailouts.\n' +
                  'For more info see: https://angular.io/guide/build#configuring-commonjs-dependencies';
              }

              // Avoid showing the same warning multiple times when in 'watch' mode.
              if (!this.shownWarnings.has(warning)) {
                compilation.warnings.push(warning);
                this.shownWarnings.add(warning);
              }
            }
          }
        }
      });
    });
  }

  private hasCommonJsDependencies(dependencies: unknown[]): boolean {
    return dependencies.some(d => d instanceof CommonJsRequireDependency || d instanceof AMDDefineDependency);
  }

  private rawRequestToPackageName(rawRequest: string): string {
    return rawRequest.startsWith('@')
      // Scoped request ex: @angular/common/locale/en -> @angular/common
      ? rawRequest.split('/', 2).join('/')
      // Non-scoped request ex: lodash/isEmpty -> lodash
      : rawRequest.split('/', 1)[0];
  }

}
