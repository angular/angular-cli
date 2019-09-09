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
  SchematicsException,
  Tree,
  apply,
  applyTemplates,
  chain,
  filter,
  mergeWith,
  move,
  noop,
  schematic,
  url,
} from '@angular-devkit/schematics';
import * as ts from '../third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { addImportToModule, addRouteDeclarationToModule } from '../utility/ast-utils';
import { InsertChange } from '../utility/change';
import { MODULE_EXT, ROUTING_MODULE_EXT, buildRelativePath, findModuleFromOptions } from '../utility/find-module';
import { applyLintFix } from '../utility/lint-fix';
import { parseName } from '../utility/parse-name';
import { createDefaultPath } from '../utility/workspace';
import { RoutingScope, Schema as ModuleOptions } from './schema';

function buildRelativeModulePath(options: ModuleOptions, modulePath: string): string {
  const importModulePath = normalize(
    `/${options.path}/`
    + (options.flat ? '' : strings.dasherize(options.name) + '/')
    + strings.dasherize(options.name)
    + '.module',
  );

  return buildRelativePath(modulePath, importModulePath);
}

function addDeclarationToNgModule(options: ModuleOptions): Rule {
  return (host: Tree) => {
    if (!options.module) {
      return host;
    }

    const modulePath = options.module;

    const text = host.read(modulePath);
    if (text === null) {
      throw new SchematicsException(`File ${modulePath} does not exist.`);
    }
    const sourceText = text.toString();
    const source = ts.createSourceFile(modulePath, sourceText, ts.ScriptTarget.Latest, true);

    const relativePath = buildRelativeModulePath(options, modulePath);
    const changes = addImportToModule(source,
                                      modulePath,
                                      strings.classify(`${options.name}Module`),
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

function addRouteDeclarationToNgModule(
  options: ModuleOptions,
  routingModulePath: Path | undefined,
): Rule {
  return (host: Tree) => {
    if (!options.route) {
      return host;
    }
    if (!options.module) {
      throw new Error('Module option required when creating a lazy loaded routing module.');
    }

    let path: string;
    if (routingModulePath) {
      path = routingModulePath;
    } else {
      path = options.module;
    }

    const text = host.read(path);
    if (!text) {
      throw new Error(`Couldn't find the module nor its routing module.`);
    }

    const sourceText = text.toString();
    const addDeclaration = addRouteDeclarationToModule(
      ts.createSourceFile(path, sourceText, ts.ScriptTarget.Latest, true),
      path,
      buildRoute(options, options.module),
    ) as InsertChange;

    const recorder = host.beginUpdate(path);
    recorder.insertLeft(addDeclaration.pos, addDeclaration.toAdd);
    host.commitUpdate(recorder);

    return host;
  };
}

function getRoutingModulePath(host: Tree, modulePath: string): Path | undefined {
  const routingModulePath = modulePath.endsWith(ROUTING_MODULE_EXT)
    ? modulePath
    : modulePath.replace(MODULE_EXT, ROUTING_MODULE_EXT);

  return host.exists(routingModulePath) ? normalize(routingModulePath) : undefined;
}

function buildRoute(options: ModuleOptions, modulePath: string) {
  const relativeModulePath = buildRelativeModulePath(options, modulePath);
  const moduleName = `${strings.classify(options.name)}Module`;
  const loadChildren = `() => import('${relativeModulePath}').then(m => m.${moduleName})`;

  return `{ path: '${options.route}', loadChildren: ${loadChildren} }`;
}

export default function (options: ModuleOptions): Rule {
  return async (host: Tree) => {
    if (options.path === undefined) {
      options.path = await createDefaultPath(host, options.project as string);
    }

    if (options.module) {
      options.module = findModuleFromOptions(host, options);
    }

    let routingModulePath: Path | undefined;
    const isLazyLoadedModuleGen = options.route && options.module;
    if (isLazyLoadedModuleGen) {
      options.routingScope = RoutingScope.Child;
      routingModulePath = getRoutingModulePath(host, options.module as string);
    }

    const parsedPath = parseName(options.path, options.name);
    options.name = parsedPath.name;
    options.path = parsedPath.path;

    const templateSource = apply(url('./files'), [
      options.routing || isLazyLoadedModuleGen && !!routingModulePath
        ? noop()
        : filter(path => !path.endsWith('-routing.module.ts.template')),
      applyTemplates({
        ...strings,
        'if-flat': (s: string) => options.flat ? '' : s,
        lazyRoute: isLazyLoadedModuleGen,
        lazyRouteWithoutRouteModule: isLazyLoadedModuleGen && !routingModulePath,
        lazyRouteWithRouteModule: isLazyLoadedModuleGen && routingModulePath,
        ...options,
      }),
      move(parsedPath.path),
    ]);
    const moduleDasherized = strings.dasherize(options.name);
    const modulePath =
      `${!options.flat ? moduleDasherized + '/' : ''}${moduleDasherized}.module.ts`;

    return chain([
      !isLazyLoadedModuleGen ? addDeclarationToNgModule(options) : noop(),
      addRouteDeclarationToNgModule(options, routingModulePath),
      mergeWith(templateSource),
      isLazyLoadedModuleGen
        ? schematic('component', {
            ...options,
            module: modulePath,
          })
        : noop(),
      options.lintFix ? applyLintFix(options.path) : noop(),
    ]);
  };
}
