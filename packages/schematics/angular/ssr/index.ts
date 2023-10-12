/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { join, normalize, strings } from '@angular-devkit/core';
import {
  Rule,
  SchematicsException,
  Tree,
  apply,
  applyTemplates,
  chain,
  externalSchematic,
  mergeWith,
  move,
  url,
} from '@angular-devkit/schematics';
import { Schema as ServerOptions } from '../server/schema';
import { DependencyType, addDependency, readWorkspace, updateWorkspace } from '../utility';
import { JSONFile } from '../utility/json-file';
import { latestVersions } from '../utility/latest-versions';
import { isStandaloneApp } from '../utility/ng-ast-utils';
import { targetBuildNotFoundError } from '../utility/project-targets';
import { getMainFilePath } from '../utility/standalone/util';
import { getWorkspace } from '../utility/workspace';
import { Builders } from '../utility/workspace-models';

import { Schema as SSROptions } from './schema';

const SERVE_SSR_TARGET_NAME = 'serve-ssr';
const PRERENDER_TARGET_NAME = 'prerender';

async function getOutputPath(
  host: Tree,
  projectName: string,
  target: 'server' | 'build',
): Promise<string> {
  // Generate new output paths
  const workspace = await readWorkspace(host);
  const project = workspace.projects.get(projectName);
  const serverTarget = project?.targets.get(target);
  if (!serverTarget || !serverTarget.options) {
    throw new SchematicsException(`Cannot find 'options' for ${projectName} ${target} target.`);
  }

  const { outputPath } = serverTarget.options;
  if (typeof outputPath !== 'string') {
    throw new SchematicsException(
      `outputPath for ${projectName} ${target} target is not a string.`,
    );
  }

  return outputPath;
}

function addScriptsRule(options: SSROptions): Rule {
  return async (host) => {
    const pkgPath = '/package.json';
    const buffer = host.read(pkgPath);
    if (buffer === null) {
      throw new SchematicsException('Could not find package.json');
    }

    const serverDist = await getOutputPath(host, options.project, 'server');
    const pkg = JSON.parse(buffer.toString()) as { scripts?: Record<string, string> };
    pkg.scripts = {
      ...pkg.scripts,
      'dev:ssr': `ng run ${options.project}:${SERVE_SSR_TARGET_NAME}`,
      'serve:ssr': `node ${serverDist}/main.js`,
      'build:ssr': `ng build && ng run ${options.project}:server`,
      'prerender': `ng run ${options.project}:${PRERENDER_TARGET_NAME}`,
    };

    host.overwrite(pkgPath, JSON.stringify(pkg, null, 2));
  };
}

function updateApplicationBuilderTsConfigRule(options: SSROptions): Rule {
  return async (host) => {
    const workspace = await readWorkspace(host);
    const project = workspace.projects.get(options.project);
    const buildTarget = project?.targets.get('build');
    if (!buildTarget || !buildTarget.options) {
      return;
    }

    const tsConfigPath = buildTarget.options.tsConfig;
    if (!tsConfigPath || typeof tsConfigPath !== 'string') {
      // No tsconfig path
      return;
    }

    const tsConfig = new JSONFile(host, tsConfigPath);
    const filesAstNode = tsConfig.get(['files']);
    const serverFilePath = 'server.ts';
    if (Array.isArray(filesAstNode) && !filesAstNode.some(({ text }) => text === serverFilePath)) {
      tsConfig.modify(['files'], [...filesAstNode, serverFilePath]);
    }
  };
}

function updateApplicationBuilderWorkspaceConfigRule(
  projectRoot: string,
  options: SSROptions,
): Rule {
  return updateWorkspace((workspace) => {
    const buildTarget = workspace.projects.get(options.project)?.targets.get('build');
    if (!buildTarget) {
      return;
    }

    buildTarget.options = {
      ...buildTarget.options,
      prerender: true,
      ssr: join(normalize(projectRoot), 'server.ts'),
    };
  });
}

function updateWebpackBuilderWorkspaceConfigRule(options: SSROptions): Rule {
  return updateWorkspace((workspace) => {
    const projectName = options.project;
    const project = workspace.projects.get(projectName);
    if (!project) {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const serverTarget = project.targets.get('server')!;
    (serverTarget.options ??= {}).main = join(normalize(project.root), 'server.ts');

    const serveSSRTarget = project.targets.get(SERVE_SSR_TARGET_NAME);
    if (serveSSRTarget) {
      return;
    }

    project.targets.add({
      name: SERVE_SSR_TARGET_NAME,
      builder: '@angular-devkit/build-angular:ssr-dev-server',
      defaultConfiguration: 'development',
      options: {},
      configurations: {
        development: {
          browserTarget: `${projectName}:build:development`,
          serverTarget: `${projectName}:server:development`,
        },
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
      builder: '@angular-devkit/build-angular:prerender',
      defaultConfiguration: 'production',
      options: {
        routes: ['/'],
      },
      configurations: {
        production: {
          browserTarget: `${projectName}:build:production`,
          serverTarget: `${projectName}:server:production`,
        },
        development: {
          browserTarget: `${projectName}:build:development`,
          serverTarget: `${projectName}:server:development`,
        },
      },
    });
  });
}

function updateWebpackBuilderServerTsConfigRule(options: SSROptions): Rule {
  return async (host) => {
    const workspace = await readWorkspace(host);
    const project = workspace.projects.get(options.project);
    const serverTarget = project?.targets.get('server');
    if (!serverTarget || !serverTarget.options) {
      return;
    }

    const tsConfigPath = serverTarget.options.tsConfig;
    if (!tsConfigPath || typeof tsConfigPath !== 'string') {
      // No tsconfig path
      return;
    }

    const tsConfig = new JSONFile(host, tsConfigPath);
    const filesAstNode = tsConfig.get(['files']);
    const serverFilePath = 'server.ts';
    if (Array.isArray(filesAstNode) && !filesAstNode.some(({ text }) => text === serverFilePath)) {
      tsConfig.modify(['files'], [...filesAstNode, serverFilePath]);
    }
  };
}

function addDependencies(): Rule {
  return chain([
    addDependency('@angular/ssr', latestVersions.AngularSSR, {
      type: DependencyType.Default,
    }),
    addDependency('express', latestVersions['express'], {
      type: DependencyType.Default,
    }),
    addDependency('@types/express', latestVersions['@types/express'], {
      type: DependencyType.Dev,
    }),
  ]);
}

function addServerFile(options: ServerOptions, isStandalone: boolean): Rule {
  return async (host) => {
    const workspace = await readWorkspace(host);
    const project = workspace.projects.get(options.project);
    if (!project) {
      throw new SchematicsException(`Invalid project name (${options.project})`);
    }

    const browserDistDirectory = await getOutputPath(host, options.project, 'build');

    return mergeWith(
      apply(
        url(
          `./files/${
            project?.targets?.get('build')?.builder === Builders.Application
              ? 'application-builder'
              : 'server-builder'
          }`,
        ),
        [
          applyTemplates({
            ...strings,
            ...options,
            browserDistDirectory,
            isStandalone,
          }),
          move(project.root),
        ],
      ),
    );
  };
}

export default function (options: SSROptions): Rule {
  return async (host) => {
    const browserEntryPoint = await getMainFilePath(host, options.project);
    const isStandalone = isStandaloneApp(host, browserEntryPoint);

    const workspace = await getWorkspace(host);
    const clientProject = workspace.projects.get(options.project);
    if (!clientProject) {
      throw targetBuildNotFoundError();
    }
    const isUsingApplicationBuilder =
      clientProject.targets.get('build')?.builder === Builders.Application;

    return chain([
      externalSchematic('@schematics/angular', 'server', {
        ...options,
        skipInstall: true,
      }),
      ...(isUsingApplicationBuilder
        ? [
            updateApplicationBuilderWorkspaceConfigRule(clientProject.root, options),
            updateApplicationBuilderTsConfigRule(options),
          ]
        : [
            addScriptsRule(options),
            updateWebpackBuilderServerTsConfigRule(options),
            updateWebpackBuilderWorkspaceConfigRule(options),
          ]),
      addServerFile(options, isStandalone),
      addDependencies(),
    ]);
  };
}
