/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Path, normalize, strings } from '@angular-devkit/core';
import {
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
  apply,
  filter,
  mergeWith,
  move,
  noop,
  template,
  url,
} from '@angular-devkit/schematics';
import * as ts from 'typescript';
import { getFirstNgModuleName } from '../utility/ast-utils';
import { buildRelativePath, findModuleFromOptions } from '../utility/find-module';
import { Schema as ServiceOptions } from './schema';

function getModuleNameFromPath(host: Tree, modulePath: Path) {
  if (!host.exists(modulePath)) {
    throw new SchematicsException(`File ${modulePath} does not exist.`);
  }

  const text = host.read(modulePath);
  if (text === null) {
    throw new SchematicsException(`File ${modulePath} cannot be read.`);
  }
  const sourceText = text.toString('utf-8');
  const source = ts.createSourceFile(modulePath, sourceText, ts.ScriptTarget.Latest, true);

  return getFirstNgModuleName(source);
}

function stripTsExtension(path: string): string {
  if (!path.endsWith('.ts')) {
    throw new SchematicsException(`File ${path} is not a Typescript file.`);
  }

  return path.substr(0, path.length - 3);
}

export default function (options: ServiceOptions): Rule {
  options.path = options.path ? normalize(options.path) : options.path;
  const sourceDir = options.sourceDir;
  if (sourceDir === undefined) {
    throw new SchematicsException(`sourceDir option is required.`);
  }

  return (host: Tree, context: SchematicContext) => {
    let providedByModule = '';
    let providedInPath = '';

    if (options.module) {
      const modulePath = findModuleFromOptions(host, options);
      if (!modulePath || !host.exists(modulePath)) {
        throw new Error('Specified module does not exist');
      }
      providedByModule = getModuleNameFromPath(host, modulePath) || '';

      if (!providedByModule) {
        throw new SchematicsException(`module option did not point to an @NgModule.`);
      }

      const servicePath = `/${options.sourceDir}/${options.path}/`
        + (options.flat ? '' : strings.dasherize(options.name) + '/')
        + strings.dasherize(options.name)
        + '.service';

      providedInPath = stripTsExtension(buildRelativePath(servicePath, modulePath));
    }

    const templateSource = apply(url('./files'), [
      options.spec ? noop() : filter(path => !path.endsWith('.spec.ts')),
      template({
        ...strings,
        'if-flat': (s: string) => options.flat ? '' : s,
        ...options,
        providedIn: providedByModule,
        providedInPath: providedInPath,
      }),
      move(sourceDir),
    ]);

    return mergeWith(templateSource)(host, context);
  };
}
