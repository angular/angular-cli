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
  normalizePath,
  template,
  url,
} from '@angular-devkit/schematics';
import 'rxjs/add/operator/merge';
import * as ts from 'typescript';
import * as stringUtils from '../strings';
import { addProviderToModule } from '../utility/ast-utils';
import { InsertChange } from '../utility/change';
import { buildRelativePath } from '../utility/find-module';

function addProviderToNgModule(options: any): Rule {
  return (host: Tree) => {
    if (!options.module) {
      return host;
    }

    const modulePath = options.module;
    if (!host.exists(options.module)) {
      throw new Error('Specified module does not exist');
    }

    const sourceText = host.read(modulePath) !.toString('utf-8');
    const source = ts.createSourceFile(modulePath, sourceText, ts.ScriptTarget.Latest, true);

    const servicePath = `/${options.sourceDir}/${options.path}/`
                        + (options.flat ? '' : stringUtils.dasherize(options.name) + '/')
                        + stringUtils.dasherize(options.name)
                        + '.service';
    const relativePath = buildRelativePath(modulePath, servicePath);
    const changes = addProviderToModule(source, modulePath,
                                        stringUtils.classify(`${options.name}Service`),
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
  options.module = normalizePath(options.module);

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
      addProviderToNgModule(options),
      mergeWith(templateSource),
    ])),
  ]);
}
