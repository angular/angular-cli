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
import {addDeclarationToModule} from '../utility/ast-utils';
import {InsertChange} from '../utility/change';
import {buildRelativePath, findModule} from '../utility/find-module';


function addDeclarationToNgModule(options: any): Rule {
  return (host: Tree) => {
    if (options.skipImport) {
      return host;
    }

    let modulePath;
    if (options.module) {
      if (!host.exists(options.module)) {
        throw new Error(`Module specified (${options.module}) does not exist.`);
      }
      modulePath = options.module;
    } else {
      modulePath = findModule(host, options.sourceDir + '/' + options.path);
    }

    const sourceText = host.read(modulePath) !.toString('utf-8');
    const source = ts.createSourceFile(modulePath, sourceText, ts.ScriptTarget.Latest, true);

    const pipePath = `/${options.sourceDir}/${options.path}/`
                     + (options.flat ? '' : stringUtils.dasherize(options.name) + '/')
                     + stringUtils.dasherize(options.name)
                     + '.pipe';
    const relativePath = buildRelativePath(modulePath, pipePath);
    const changes = addDeclarationToModule(source, modulePath,
                                           stringUtils.classify(`${options.name}Pipe`),
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

  const templateSource = apply(url('./files'), [
    options.spec ? noop() : filter(path => !path.endsWith('.spec.ts')),
    template({
      ...stringUtils,
      'if-flat': (s: string) => options.flat ? '' : s,
      ...options,
    }),
    move(options.sourceDir),
  ]);

  return chain([
    branchAndMerge(chain([
      filter(path => path.endsWith('.module.ts') && !path.endsWith('-routing.module.ts')),
      addDeclarationToNgModule(options),
      mergeWith(templateSource),
    ])),
  ]);
}
