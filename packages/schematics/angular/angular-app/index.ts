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
  Rule,
  Tree,
  apply,
  chain,
  mergeWith,
  schematic,
  template,
  url,
} from '@angular-devkit/schematics';
import * as stringUtils from '../strings';
import {addBootstrapToModule, addImportToModule} from '../utility/ast-utils';

import * as ts from 'typescript';
import {InsertChange} from '../utility/change';


function addBootstrapToNgModule(): Rule {
  return (host: Tree) => {
    const modulePath = 'src/app/app.module.ts';
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
  return chain([
    mergeWith(
      apply(url('./files'), [
        template({ utils: stringUtils, ...options }),
      ])),
    schematic('module', { name: 'app' }),
    schematic('component', {
      name: 'app',
      selector: 'app-root',
      flat: true,
    }),
    addBootstrapToNgModule(),
  ]);
};
