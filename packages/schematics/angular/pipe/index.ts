/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
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
import { addDeclarationToModule, addExportToModule } from '../utility/ast-utils';
import { InsertChange } from '../utility/change';
import { buildRelativePath, findModule, findModuleFromOptions } from '../utility/find-module';
import { Schema as PipeOptions } from './schema';


function addDeclarationToNgModule(options: PipeOptions): Rule {
  return (host: Tree) => {
    if (options.skipImport) {
      return host;
    }

    let modulePath;
    if (options.module) {
      if (!host.exists(options.module)) {
        throw new Error('Specified module does not exist');
      }
      modulePath = options.module;
    } else {
      let pathToCheck = options.sourceDir + '/' + options.path;
      pathToCheck += options.flat ? '' : '/' + stringUtils.dasherize(options.name);
      modulePath = findModule(host, pathToCheck);
    }

    let sourceText = host.read(modulePath) !.toString('utf-8');
    let source = ts.createSourceFile(modulePath, sourceText, ts.ScriptTarget.Latest, true);

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

    if (options.export) {
      sourceText = host.read(modulePath) !.toString('utf-8');
      source = ts.createSourceFile(modulePath, sourceText, ts.ScriptTarget.Latest, true);

      const exportRecorder = host.beginUpdate(modulePath);
      const exportChanges = addExportToModule(source, modulePath,
                                              stringUtils.classify(`${options.name}Pipe`),
                                              relativePath);

      for (const change of exportChanges) {
        if (change instanceof InsertChange) {
          exportRecorder.insertLeft(change.pos, change.toAdd);
        }
      }
      host.commitUpdate(exportRecorder);
    }

    return host;
  };
}

export default function (options: PipeOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    options.module = findModuleFromOptions(host, options);

    const templateSource = apply(url('./files'), [
      options.spec ? noop() : filter(path => !path.endsWith('.spec.ts')),
      template({
        ...stringUtils,
        'if-flat': (s: string) => options.flat ? '' : s,
        ...options as object,
      }),
      move(options.sourceDir !),
    ]);

    return chain([
      branchAndMerge(chain([
        filter(path => path.endsWith('.module.ts') && !path.endsWith('-routing.module.ts')),
        addDeclarationToNgModule(options),
        mergeWith(templateSource),
      ])),
    ])(host, context);
  };
}
