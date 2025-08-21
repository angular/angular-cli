/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  Rule,
  Tree,
  apply,
  applyTemplates,
  chain,
  filter,
  mergeWith,
  move,
  noop,
  schematic,
  strings,
  url,
} from '@angular-devkit/schematics';
import { join } from 'node:path/posix';
import { Schema as ComponentOptions } from '../component/schema';
import * as ts from '../third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { addImportToModule, addRouteDeclarationToModule } from '../utility/ast-utils';
import { InsertChange } from '../utility/change';
import {
  MODULE_EXT,
  MODULE_EXT_LEGACY,
  ROUTING_MODULE_EXT,
  ROUTING_MODULE_EXT_LEGACY,
  buildRelativePath,
  findModuleFromOptions,
} from '../utility/find-module';
import { parseName } from '../utility/parse-name';
import { createProjectSchematic } from '../utility/project';
import { validateClassName } from '../utility/validation';
import { createDefaultPath } from '../utility/workspace';
import { Schema as ModuleOptions, RoutingScope } from './schema';

function buildRelativeModulePath(options: ModuleOptions, modulePath: string): string {
  const importModulePath = join(
    options.path ?? '',
    options.flat ? '' : strings.dasherize(options.name),
    strings.dasherize(options.name) + options.typeSeparator + 'module',
  );

  return buildRelativePath(modulePath, importModulePath);
}

function addImportToNgModule(options: ModuleOptions): Rule {
  return (host: Tree) => {
    if (!options.module) {
      return host;
    }

    const modulePath = options.module;

    const sourceText = host.readText(modulePath);
    const source = ts.createSourceFile(modulePath, sourceText, ts.ScriptTarget.Latest, true);

    const relativePath = buildRelativeModulePath(options, modulePath);
    const changes = addImportToModule(
      source,
      modulePath,
      strings.classify(`${options.name}Module`),
      relativePath,
    );

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
  routingModulePath: string | undefined,
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

    const sourceText = host.readText(path);

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

function getRoutingModulePath(host: Tree, modulePath: string): string | undefined {
  const routingModulePath =
    modulePath.endsWith(ROUTING_MODULE_EXT_LEGACY) || modulePath.endsWith(ROUTING_MODULE_EXT)
      ? modulePath
      : modulePath
          .replace(MODULE_EXT_LEGACY, ROUTING_MODULE_EXT_LEGACY)
          .replace(MODULE_EXT, ROUTING_MODULE_EXT);

  return host.exists(routingModulePath) ? routingModulePath : undefined;
}

function buildRoute(options: ModuleOptions, modulePath: string) {
  const relativeModulePath = buildRelativeModulePath(options, modulePath);
  const moduleName = `${strings.classify(options.name)}Module`;
  const loadChildren = `() => import('${relativeModulePath}').then(m => m.${moduleName})`;

  return `{ path: '${options.route}', loadChildren: ${loadChildren} }`;
}

export default createProjectSchematic<ModuleOptions>(async (options, { tree }) => {
  if (options.path === undefined) {
    options.path = await createDefaultPath(tree, options.project);
  }

  if (options.module) {
    options.module = findModuleFromOptions(tree, options);
  }

  let routingModulePath;
  const isLazyLoadedModuleGen = !!(options.route && options.module);
  if (isLazyLoadedModuleGen) {
    options.routingScope = RoutingScope.Child;
    routingModulePath = getRoutingModulePath(tree, options.module as string);
  }

  const parsedPath = parseName(options.path, options.name);
  options.name = parsedPath.name;
  options.path = parsedPath.path;
  validateClassName(strings.classify(options.name));

  const templateSource = apply(url('./files'), [
    options.routing || (isLazyLoadedModuleGen && routingModulePath)
      ? noop()
      : filter((path) => !path.includes('-routing')),
    applyTemplates({
      ...strings,
      'if-flat': (s: string) => (options.flat ? '' : s),
      lazyRoute: isLazyLoadedModuleGen,
      lazyRouteWithoutRouteModule: isLazyLoadedModuleGen && !routingModulePath,
      lazyRouteWithRouteModule: isLazyLoadedModuleGen && !!routingModulePath,
      ...options,
    }),
    move(parsedPath.path),
  ]);
  const moduleDasherized = strings.dasherize(options.name);
  const modulePath = `${
    !options.flat ? moduleDasherized + '/' : ''
  }${moduleDasherized}${options.typeSeparator}module.ts`;

  const componentOptions: ComponentOptions = {
    module: modulePath,
    flat: options.flat,
    name: options.name,
    path: options.path,
    project: options.project,
    standalone: false,
  };

  return chain([
    !isLazyLoadedModuleGen ? addImportToNgModule(options) : noop(),
    addRouteDeclarationToNgModule(options, routingModulePath),
    mergeWith(templateSource),
    isLazyLoadedModuleGen ? schematic('component', componentOptions) : noop(),
  ]);
});
