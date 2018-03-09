/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { strings } from '@angular-devkit/core';
import {
  MergeStrategy,
  Rule,
  SchematicContext,
  Tree,
  apply,
  chain,
  filter,
  mergeWith,
  move,
  noop,
  schematic,
  template,
  url,
} from '@angular-devkit/schematics';
import {
  NodePackageInstallTask,
  NodePackageLinkTask,
  RepositoryInitializerTask,
} from '@angular-devkit/schematics/tasks';
import { Schema as ApplicationOptions } from './schema';


function minimalPathFilter(path: string): boolean {
  const toRemoveList: RegExp[] = [/e2e\//, /editorconfig/, /README/, /karma.conf.js/,
                                  /protractor.conf.js/, /test.ts/, /tsconfig.spec.json/,
                                  /tslint.json/, /favicon.ico/];

  return !toRemoveList.some(re => re.test(path));
}
export default function (options: ApplicationOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    const appRootSelector = `${options.prefix}-root`;
    const componentOptions = !options.minimal ?
      {
        inlineStyle: options.inlineStyle,
        inlineTemplate: options.inlineTemplate,
        spec: !options.skipTests,
        styleext: options.style,
      } :
      {
        inlineStyle: true,
        inlineTemplate: true,
        spec: false,
        styleext: options.style,
      };
    const sourceDir = options.sourceDir || 'src';

    let packageTask;
    if (!options.skipInstall) {
      packageTask = context.addTask(new NodePackageInstallTask(options.directory));
      if (options.linkCli) {
        packageTask = context.addTask(
          new NodePackageLinkTask('@angular/cli', options.directory),
          [packageTask],
        );
      }
    }
    if (!options.skipGit) {
      context.addTask(
        new RepositoryInitializerTask(
          options.directory,
          options.commit,
        ),
        packageTask ? [packageTask] : [],
      );
    }

    return chain([
      mergeWith(
        apply(url('./files'), [
          options.minimal ? filter(minimalPathFilter) : noop(),
          options.skipGit ? filter(path => !path.endsWith('/__dot__gitignore')) : noop(),
          options.serviceWorker ? noop() : filter(path => !path.endsWith('/ngsw-config.json')),
          template({
            utils: strings,
            ...options,
            'dot': '.',
            sourcedir: sourceDir,
          }),
          move(options.directory),
        ])),
      schematic('module', {
        name: 'app',
        commonModule: false,
        flat: true,
        routing: options.routing,
        routingScope: 'Root',
        path: options.directory + '/' + sourceDir + '/' + options.path,
        spec: false,
      }),
      schematic('component', {
        name: 'app',
        selector: appRootSelector,
        flat: true,
        path: options.directory + '/' + sourceDir + '/' + options.path,
        skipImport: true,
        ...componentOptions,
      }),
      mergeWith(
        apply(url('./other-files'), [
          componentOptions.inlineTemplate ? filter(path => !path.endsWith('.html')) : noop(),
          !componentOptions.spec ? filter(path => !path.endsWith('.spec.ts')) : noop(),
          template({
            utils: strings,
            ...options as any,  // tslint:disable-line:no-any
            selector: appRootSelector,
            ...componentOptions,
          }),
          move(options.directory + '/' + sourceDir + '/app'),
        ]), MergeStrategy.Overwrite),
    ])(host, context);
  };
}
