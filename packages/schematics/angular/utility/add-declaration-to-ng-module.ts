/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Rule, Tree, strings } from '@angular-devkit/schematics';
import * as ts from '../third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { addDeclarationToModule, addSymbolToNgModuleMetadata } from './ast-utils';
import { InsertChange } from './change';
import { buildRelativePath } from './find-module';

export interface DeclarationToNgModuleOptions {
  module?: string;
  path?: string;
  name: string;
  flat?: boolean;
  export?: boolean;
  type: string;
  skipImport?: boolean;
  standalone?: boolean;
}

export function addDeclarationToNgModule(options: DeclarationToNgModuleOptions): Rule {
  return (host: Tree) => {
    const modulePath = options.module;
    if (options.skipImport || options.standalone || !modulePath) {
      return host;
    }

    const sourceText = host.readText(modulePath);
    const source = ts.createSourceFile(modulePath, sourceText, ts.ScriptTarget.Latest, true);

    const filePath =
      `/${options.path}/` +
      (options.flat ? '' : strings.dasherize(options.name) + '/') +
      strings.dasherize(options.name) +
      (options.type ? '.' : '') +
      strings.dasherize(options.type);

    const importPath = buildRelativePath(modulePath, filePath);
    const classifiedName = strings.classify(options.name) + strings.classify(options.type);
    const changes = addDeclarationToModule(source, modulePath, classifiedName, importPath);

    if (options.export) {
      changes.push(...addSymbolToNgModuleMetadata(source, modulePath, 'exports', classifiedName));
    }

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
