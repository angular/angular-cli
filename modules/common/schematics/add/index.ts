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
import {parseJsonAst, JsonParseMode, normalize, join} from '@angular-devkit/core';
import {
  findPropertyInAstObject,
  appendValueInAstArray,
} from '@schematics/angular/utility/json-utils';
import {Schema as UniversalOptions} from '@schematics/angular/universal/schema';
import {updateWorkspace} from '@schematics/angular/utility/workspace';
import {addPackageJsonDependency, NodeDependencyType} from '@schematics/angular/utility/dependencies';

import {stripTsExtension, getOutputPath, getProject} from '../utils';

const SERVE_SSR_TARGET_NAME = 'serve-ssr';
const PRERENDER_TARGET_NAME = 'prerender';

export interface AddUniversalOptions extends UniversalOptions {
  serverFileName?: string;
}

export function addUniversalCommonRule(options: AddUniversalOptions): Rule {
  return async host => {
    const clientProject = await getProject(host, options.clientProject);

    return chain([
      clientProject.targets.has('server')
        ? noop()
        : externalSchematic('@schematics/angular', 'universal', {
          ...options,
          skipInstall: true
        }),
      addScriptsRule(options),
      updateServerTsConfigRule(options),
      updateWorkspaceConfigRule(options),
      addDependencies(),
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
      'dev:ssr': `ng run ${options.clientProject}:${SERVE_SSR_TARGET_NAME}`,
      'serve:ssr': `node ${serverDist}/main.js`,
      'build:ssr': `ng build --prod && ng run ${options.clientProject}:server:production`,
      'prerender': `ng run ${options.clientProject}:${PRERENDER_TARGET_NAME}`,
    };

    host.overwrite(pkgPath, JSON.stringify(pkg, null, 2));
  };
}

function updateWorkspaceConfigRule(options: AddUniversalOptions): Rule {
  return () => {
    return updateWorkspace(workspace => {
      const projectName = options.clientProject;
      const project = workspace.projects.get(projectName);
      if (!project) {
        return;
      }

      const serverTarget = project.targets.get('server');
      serverTarget.options.main = join(
        normalize(project.root),
        stripTsExtension(options.serverFileName) + '.ts',
      );

      const serveSSRTarget = project.targets.get(SERVE_SSR_TARGET_NAME);
      if (serveSSRTarget) {
        return;
      }

      project.targets.add({
        name: SERVE_SSR_TARGET_NAME,
        builder: '@nguniversal/builders:ssr-dev-server',
        options: {
          browserTarget: `${projectName}:build`,
          serverTarget: `${projectName}:server`,
        },
        configurations: {
          production: {
            browserTarget: `${projectName}:build:production`,
            serverTarget: `${projectName}:server:production`,
          },
        },
      });

      const prerenderTarget = project.targets.get(PRERENDER_TARGET_NAME);
      if (prerenderTarget) {
        return;
      }

      project.targets.add({
        name: PRERENDER_TARGET_NAME,
        builder: '@nguniversal/builders:prerender',
        options: {
          browserTarget: `${projectName}:build:production`,
          serverTarget: `${projectName}:server:production`,
          routes: []
        }
      });
    });
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

function addDependencies(): Rule {
  return host => {
    addPackageJsonDependency(host, {
      name: '@nguniversal/builders',
      type: NodeDependencyType.Dev,
      version: '^0.0.0-PLACEHOLDER',
    });

    return host;
  };
}
