/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  BuildEvent,
  Builder,
  BuilderConfiguration,
  BuilderContext,
} from '@angular-devkit/architect';
import { getSystemPath, normalize, resolve } from '@angular-devkit/core';
import * as ngPackagr from 'ng-packagr';
import { Observable } from 'rxjs';

// TODO move this function to architect or somewhere else where it can be imported from.
// Blatantly copy-pasted from 'require-project-module.ts'.
function requireProjectModule(root: string, moduleName: string) {
  return require(require.resolve(moduleName, { paths: [root] }));
}


export interface NgPackagrBuilderOptions {
  project: string;
  tsConfig?: string;
}

export class NgPackagrBuilder implements Builder<NgPackagrBuilderOptions> {

  constructor(public context: BuilderContext) { }

  run(builderConfig: BuilderConfiguration<NgPackagrBuilderOptions>): Observable<BuildEvent> {
    const root = this.context.workspace.root;
    const options = builderConfig.options;

    if (!options.project) {
      throw new Error('A "project" must be specified to build a library\'s npm package.');
    }

    return new Observable(obs => {
      const projectNgPackagr = requireProjectModule(
        getSystemPath(root), 'ng-packagr') as typeof ngPackagr;
      const packageJsonPath = getSystemPath(resolve(root, normalize(options.project)));

      const ngPkgProject = projectNgPackagr.ngPackagr()
        .forProject(packageJsonPath);

      if (options.tsConfig) {
        const tsConfigPath = getSystemPath(resolve(root, normalize(options.tsConfig)));
        ngPkgProject.withTsConfig(tsConfigPath);
      }

      ngPkgProject.build()
        .then(() => {
          obs.next({ success: true });
          obs.complete();
        })
        .catch((e) => obs.error(e));
    });
  }

}

export default NgPackagrBuilder;
