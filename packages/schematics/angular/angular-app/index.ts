/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// TODO: replace `options: any` with an actual type generated from the schema.
// tslint:disable:no-any
import {
  MergeStrategy,
  Rule,
  Tree,
  apply,
  chain,
  mergeWith,
  move,
  schematic,
  template,
  url,
} from '@angular-devkit/schematics';
import * as ts from 'typescript';
import * as stringUtils from '../strings';
import { addBootstrapToModule, addImportToModule } from '../utility/ast-utils';
import { InsertChange } from '../utility/change';


function addBootstrapToNgModule(directory: string): Rule {
  return (host: Tree) => {
    const modulePath = `${directory}/src/app/app.module.ts`;
    const sourceText = host.read(modulePath) !.toString('utf-8');
    const source = ts.createSourceFile(modulePath, sourceText, ts.ScriptTarget.Latest, true);

    const componentModule = './app.component';

    const importChanges = addImportToModule(source,
                                            modulePath,
                                            'BrowserModule',
                                            '@angular/platform-browser');
    const bootstrapChanges = addBootstrapToModule(source,
                                                  modulePath,
                                                  'AppComponent',
                                                  componentModule);
    const changes = [
      ...importChanges,
      ...bootstrapChanges,
    ];

    const recorder = host.beginUpdate(modulePath);
    for (const change of changes) {
      if (change instanceof InsertChange) {
        recorder.insertLeft(change.pos, change.toAdd);
      }
    }
    host.commitUpdate(recorder);

    return host;
  };
}

export default function (options: any): Rule {
  const appRootSelector = 'app-root';

  return chain([
    mergeWith(
      apply(url('./files'), [
        template({
          utils: stringUtils,
          'dot': '.',
          ...options }),
        move(options.directory),
      ])),
    schematic('module', {
      name: 'app',
      sourceDir: options.directory + '/' + options.sourceDir,
    }),
    schematic('component', {
      name: 'app',
      selector: appRootSelector,
      sourceDir: options.directory + '/' + options.sourceDir,
      flat: true,
    }),
    addBootstrapToNgModule(options.directory),
    mergeWith(
      apply(url('./other-files'), [
        template({ utils: stringUtils, ...options, selector: appRootSelector }),
        move(options.directory + '/' + options.sourceDir + '/app'),
      ]), MergeStrategy.Overwrite),
  ]);
}
