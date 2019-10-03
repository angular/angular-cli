/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  chain,
  externalSchematic,
  Rule,
  SchematicsException,
  noop,
} from '@angular-devkit/schematics';
import {parseJsonAst, JsonParseMode} from '@angular-devkit/core';
import {
  findPropertyInAstObject,
  appendValueInAstArray,
} from '@schematics/angular/utility/json-utils';
import {Schema as UniversalOptions} from '@schematics/angular/universal/schema';
import {stripTsExtension, getOutputPath, getProject} from '../utils';

export interface AddUniversalOptions extends UniversalOptions {
  serverFileName?: string;
}

export function addUniversalCommonRule(options: AddUniversalOptions): Rule {
  return async host => {
    const clientProject = await getProject(host, options.clientProject);

    return chain([
      clientProject.targets.has('server')
        ? noop()
        : externalSchematic('@schematics/angular', 'universal', options),
      addScriptsRule(options),
      updateServerTsConfigRule(options),
    ]);
  };
}

function addScriptsRule(options: AddUniversalOptions): Rule {
  return async host => {
    const pkgPath = '/package.json';
    const buffer = host.read(pkgPath);
    if (buffer === null) {
      throw new SchematicsException('Could not find package.json');
    }

    const serverDist = await getOutputPath(host, options.clientProject, 'server');
    const pkg = JSON.parse(buffer.toString());
    pkg.scripts = {
      ...pkg.scripts,
      'serve:ssr': `node ${serverDist}/main.js`,
      'build:ssr': `ng build --prod && ng run ${options.clientProject}:server:production`,
    };

    host.overwrite(pkgPath, JSON.stringify(pkg, null, 2));
  };
}

function updateServerTsConfigRule(options: AddUniversalOptions): Rule {
  return async host => {
    const clientProject = await getProject(host, options.clientProject);
    const serverTarget = clientProject.targets.get('server');
    if (!serverTarget || !serverTarget.options) {
      return;
    }

    const tsConfigPath = serverTarget.options.tsConfig;
    if (!tsConfigPath || typeof tsConfigPath !== 'string') {
      // No tsconfig path
      return;
    }

    const configBuffer = host.read(tsConfigPath);
    if (!configBuffer) {
      throw new SchematicsException(`Could not find (${tsConfigPath})`);
    }

    const content = configBuffer.toString();
    const tsConfigAst = parseJsonAst(content, JsonParseMode.Loose);
    if (!tsConfigAst || tsConfigAst.kind !== 'object') {
      throw new SchematicsException(`Invalid JSON AST Object (${tsConfigPath})`);
    }

    const filesAstNode = findPropertyInAstObject(tsConfigAst, 'files');

    const serverFilePath = stripTsExtension(options.serverFileName) + '.ts';
    if (
      filesAstNode &&
      filesAstNode.kind === 'array' &&
      !filesAstNode.elements.some(({ text }) => text === serverFilePath)) {
      const recorder = host.beginUpdate(tsConfigPath);

      appendValueInAstArray(
        recorder,
        filesAstNode,
        stripTsExtension(options.serverFileName) + '.ts',
      );

      host.commitUpdate(recorder);
    }
  };
}

export default function (options: UniversalOptions): Rule {
  return async host => {
    const clientProject = await getProject(host, options.clientProject);

    return chain([
      clientProject.targets.has('server')
        ? noop()
        : externalSchematic('@schematics/angular', 'universal', options),
      addScriptsRule(options),
      updateServerTsConfigRule(options),
    ]);
  };
}
