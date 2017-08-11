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
  SchematicContext,
  Tree,
  apply,
  branchAndMerge,
  chain,
  filter,
  mergeWith,
  move,
  noop,
  template,
  url,
} from '@angular-devkit/schematics';
import 'rxjs/add/operator/merge';
import * as ts from 'typescript';
import * as stringUtils from '../strings';
import { addProviderToModule } from '../utility/ast-utils';
import { InsertChange } from '../utility/change';
import { buildRelativePath, findModuleFromOptions } from '../utility/find-module';


function addDeclarationToNgModule(options: any): Rule {
  return (host: Tree) => {
    if (!options.module) {
      return host;
    }

    if (!host.exists(options.module)) {
      throw new Error('Specified module does not exist');
    }
    const modulePath = options.module;

    const sourceText = host.read(modulePath) !.toString('utf-8');
    const source = ts.createSourceFile(modulePath, sourceText, ts.ScriptTarget.Latest, true);

    const guardPath = `/${options.sourceDir}/${options.path}/`
                          + (options.flat ? '' : stringUtils.dasherize(options.name) + '/')
                          + stringUtils.dasherize(options.name)
                          + '.guard';
    const relativePath = buildRelativePath(modulePath, guardPath);
    const changes = addProviderToModule(source, modulePath,
                                        stringUtils.classify(`${options.name}Guard`),
                                        relativePath);
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
  return (host: Tree, context: SchematicContext) => {
    options.module = findModuleFromOptions(host, options);

    const templateSource = apply(url('./files'), [
      options.spec ? noop() : filter(path => !path.endsWith('.spec.ts')),
      template({
        ...stringUtils,
        ...options,
      }),
      move(options.sourceDir),
    ]);

    return chain([
      branchAndMerge(chain([
        addDeclarationToNgModule(options),
        mergeWith(templateSource),
      ])),
    ])(host, context);
  };
}
