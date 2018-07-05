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
import { getSystemPath, normalize, resolve, tags } from '@angular-devkit/core';
import * as fs from 'fs';
import * as ngPackagr from 'ng-packagr';
import { EMPTY, Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import * as semver from 'semver';

const NEW_NG_PACKAGR_VERSION = '4.0.0-rc.3';

// TODO move this function to architect or somewhere else where it can be imported from.
// Blatantly copy-pasted from 'require-project-module.ts'.
function requireProjectModule(root: string, moduleName: string) {
  return require(require.resolve(moduleName, { paths: [root] }));
}

function resolveProjectModule(root: string, moduleName: string) {
  return require.resolve(moduleName, { paths: [root] });
}

export interface NgPackagrBuilderOptions {
  project: string;
  tsConfig?: string;
  watch?: boolean;
}

function checkNgPackagrVersion(projectRoot: string): boolean {
  let ngPackagrJsonPath;

  try {
    ngPackagrJsonPath = resolveProjectModule(projectRoot, 'ng-packagr/package.json');
  } catch {
    // ng-packagr is not installed
    throw new Error(tags.stripIndent`
    ng-packagr is not installed. Run \`npm install ng-packagr --save-dev\` and try again.
  `);
  }

  const ngPackagrPackageJson = fs.readFileSync(ngPackagrJsonPath).toString();
  const ngPackagrVersion = JSON.parse(ngPackagrPackageJson)['version'];

  if (!semver.gte(ngPackagrVersion, NEW_NG_PACKAGR_VERSION)) {
    throw new Error(tags.stripIndent`
    The installed version of ng-packagr is ${ngPackagrVersion}. The watch feature
    requires ng-packagr version to satisfy ${NEW_NG_PACKAGR_VERSION}.
    Please upgrade your ng-packagr version.
  `);
  }

  return true;
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

      if (options.watch) {
        checkNgPackagrVersion(getSystemPath(root));

        const ngPkgSubscription = ngPkgProject
          .watch()
          .pipe(
            tap(() => obs.next({ success: true })),
            catchError(e => {
              obs.error(e);

              return EMPTY;
            }),
          )
          .subscribe();

        return () => ngPkgSubscription.unsubscribe();
      } else {
        ngPkgProject.build()
          .then(() => {
            obs.next({ success: true });
            obs.complete();
          })
          .catch(e => obs.error(e));
      }
    });
  }

}

export default NgPackagrBuilder;
