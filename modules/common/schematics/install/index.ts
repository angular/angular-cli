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
import {Schema as UniversalOptions} from './schema';
import {stripTsExtension, getDistPaths, getClientProject} from './utils';

function addScriptsRule(options: UniversalOptions): Rule {
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

function updateConfigFileRule(options: UniversalOptions): Rule {
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

function updateServerTsConfigRule(options: UniversalOptions): Rule {
  return async host => {
    const clientProject = await getClientProject(host, options.clientProject);
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

    if (filesAstNode && filesAstNode.kind === 'array') {
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
    const clientProject = await getClientProject(host, options.clientProject);

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
