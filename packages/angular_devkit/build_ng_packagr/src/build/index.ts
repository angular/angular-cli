/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuildEvent, Builder, BuilderContext, Target } from '@angular-devkit/architect';
import { getSystemPath } from '@angular-devkit/core';
import * as ngPackagr from 'ng-packagr';
import { resolve as resolvePath } from 'path';
import { Observable } from 'rxjs/Observable';

// XX: blatantly copy-pasted from 'require-project-module.ts'
const resolve = require('resolve');
function requireProjectModule(root: string, moduleName: string) {
  return require(resolve.sync(moduleName, { basedir: root }));
}


export interface NgPackagrBuilderOptions {
  project: string;
}

export class NgPackagrBuilder implements Builder<NgPackagrBuilderOptions> {

  constructor(public context: BuilderContext) { }

  run(target: Target<NgPackagrBuilderOptions>): Observable<BuildEvent> {
    const root = getSystemPath(target.root);
    const options = target.options;

    if (!options.project) {
      throw new Error('A "project" must be specified to build a library\'s npm package.');
    }

    return new Observable(obs => {
      const projectNgPackagr = requireProjectModule(root, 'ng-packagr') as typeof ngPackagr;
      const packageJsonPath = resolvePath(root, options.project);

      projectNgPackagr.ngPackagr()
        .forProject(packageJsonPath)
        .build()
        .then(() => obs.complete())
        .catch((e) => obs.error(e));
    });
  }

}

export default NgPackagrBuilder;
