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
import {normalize, join, parseJsonAst, JsonParseMode} from '@angular-devkit/core';
import {updateWorkspace} from '@schematics/angular/utility/workspace';
import {
  findPropertyInAstObject,
  appendValueInAstArray,
} from '@schematics/angular/utility/json-utils';
import {Schema as UniversalOptions} from '@schematics/angular/universal/schema';
import {stripTsExtension, getDistPaths, getProject} from '../utils';

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
      updateConfigFileRule(options),
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

    const {server: serverDist} = await getDistPaths(host, options.clientProject);
    const pkg = JSON.parse(buffer.toString());
    pkg.scripts = {
      ...pkg.scripts,
      'serve:ssr': `node ${serverDist}/main.js`,
      'build:ssr': `ng build --prod && ng run ${options.clientProject}:server:production`,
    };

    host.overwrite(pkgPath, JSON.stringify(pkg, null, 2));
  };
}

function updateConfigFileRule(options: AddUniversalOptions): Rule {
  return host => {
    return updateWorkspace((async workspace => {
      const clientProject = workspace.projects.get(options.clientProject);
      if (clientProject) {
        const buildTarget = clientProject.targets.get('build');
        const serverTarget = clientProject.targets.get('server');

        // We have to check if the project config has a server target, because
        // if the Universal step in this schematic isn't run, it can't be guaranteed
        // to exist
        if (!serverTarget || !buildTarget) {
          return;
        }

        const distPaths = await getDistPaths(host, options.clientProject);

        serverTarget.options = {
          ...serverTarget.options,
          outputPath: distPaths.server,
        };

        serverTarget.options.main = join(
          normalize(clientProject.root),
          stripTsExtension(options.serverFileName) + '.ts',
        );

        buildTarget.options = {
          ...buildTarget.options,
          outputPath: distPaths.browser,
        };
      }
    })) as unknown as Rule;
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
