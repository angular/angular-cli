/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { isJsonObject, join, normalize, strings } from '@angular-devkit/core';
import {
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
  apply,
  applyTemplates,
  chain,
  mergeWith,
  move,
  schematic,
  url,
} from '@angular-devkit/schematics';
import { posix } from 'node:path';
import { Schema as ServerOptions } from '../server/schema';
import {
  DependencyType,
  InstallBehavior,
  addDependency,
  readWorkspace,
  updateWorkspace,
} from '../utility';
import { JSONFile } from '../utility/json-file';
import { latestVersions } from '../utility/latest-versions';
import { isStandaloneApp } from '../utility/ng-ast-utils';
import { isUsingApplicationBuilder, targetBuildNotFoundError } from '../utility/project-targets';
import { getMainFilePath } from '../utility/standalone/util';
import { getWorkspace } from '../utility/workspace';

import { Schema as SSROptions } from './schema';

const SERVE_SSR_TARGET_NAME = 'serve-ssr';
const PRERENDER_TARGET_NAME = 'prerender';
const DEFAULT_BROWSER_DIR = 'browser';
const DEFAULT_MEDIA_DIR = 'media';
const DEFAULT_SERVER_DIR = 'server';

async function getLegacyOutputPaths(
  host: Tree,
  projectName: string,
  target: 'server' | 'build',
): Promise<string> {
  // Generate new output paths
  const workspace = await readWorkspace(host);
  const project = workspace.projects.get(projectName);
  const architectTarget = project?.targets.get(target);
  if (!architectTarget?.options) {
    throw new SchematicsException(`Cannot find 'options' for ${projectName} ${target} target.`);
  }

  const { outputPath } = architectTarget.options;
  if (typeof outputPath !== 'string') {
    throw new SchematicsException(
      `outputPath for ${projectName} ${target} target is not a string.`,
    );
  }

  return outputPath;
}

async function getApplicationBuilderOutputPaths(
  host: Tree,
  projectName: string,
): Promise<{ browser: string; server: string; base: string }> {
  // Generate new output paths
  const target = 'build';
  const workspace = await readWorkspace(host);
  const project = workspace.projects.get(projectName);
  const architectTarget = project?.targets.get(target);

  if (!architectTarget?.options) {
    throw new SchematicsException(`Cannot find 'options' for ${projectName} ${target} target.`);
  }

  const { outputPath } = architectTarget.options;
  if (outputPath === null || outputPath === undefined) {
    throw new SchematicsException(
      `outputPath for ${projectName} ${target} target is undefined or null.`,
    );
  }

  const defaultDirs = {
    server: DEFAULT_SERVER_DIR,
    browser: DEFAULT_BROWSER_DIR,
  };

  if (outputPath && isJsonObject(outputPath)) {
    return {
      ...defaultDirs,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(outputPath as any),
    };
  }

  if (typeof outputPath !== 'string') {
    throw new SchematicsException(
      `outputPath for ${projectName} ${target} target is not a string.`,
    );
  }

  return {
    base: outputPath,
    ...defaultDirs,
  };
}

function addScriptsRule({ project }: SSROptions, isUsingApplicationBuilder: boolean): Rule {
  return async (host) => {
    const pkgPath = '/package.json';
    const pkg = host.readJson(pkgPath) as { scripts?: Record<string, string> } | null;
    if (pkg === null) {
      throw new SchematicsException('Could not find package.json');
    }

    if (isUsingApplicationBuilder) {
      const { base, server } = await getApplicationBuilderOutputPaths(host, project);
      pkg.scripts ??= {};
      pkg.scripts[`serve:ssr:${project}`] = `node ${posix.join(base, server)}/server.mjs`;
    } else {
      const serverDist = await getLegacyOutputPaths(host, project, 'server');
      pkg.scripts = {
        ...pkg.scripts,
        'dev:ssr': `ng run ${project}:${SERVE_SSR_TARGET_NAME}`,
        'serve:ssr': `node ${serverDist}/main.js`,
        'build:ssr': `ng build && ng run ${project}:server`,
        'prerender': `ng run ${project}:${PRERENDER_TARGET_NAME}`,
      };
    }

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

    const json = new JSONFile(host, tsConfigPath);
    const filesPath = ['files'];
    const files = new Set((json.get(filesPath) as string[] | undefined) ?? []);
    files.add('src/server.ts');
    json.modify(filesPath, [...files]);
  };
}

function updateApplicationBuilderWorkspaceConfigRule(
  projectSourceRoot: string,
  options: SSROptions,
  { logger }: SchematicContext,
): Rule {
  return updateWorkspace((workspace) => {
    const buildTarget = workspace.projects.get(options.project)?.targets.get('build');
    if (!buildTarget) {
      return;
    }

    let outputPath = buildTarget.options?.outputPath;
    if (outputPath && isJsonObject(outputPath)) {
      if (outputPath.browser === '') {
        const base = outputPath.base as string;
        logger.warn(
          `The output location of the browser build has been updated from "${base}" to "${posix.join(
            base,
            DEFAULT_BROWSER_DIR,
          )}".
          You might need to adjust your deployment pipeline.`,
        );

        if (
          (outputPath.media && outputPath.media !== DEFAULT_MEDIA_DIR) ||
          (outputPath.server && outputPath.server !== DEFAULT_SERVER_DIR)
        ) {
          delete outputPath.browser;
        } else {
          outputPath = outputPath.base;
        }
      }
    }

    buildTarget.options = {
      ...buildTarget.options,
      outputPath,
      outputMode: 'server',
      ssr: {
        entry: join(normalize(projectSourceRoot), 'server.ts'),
      },
    };
  });
}

function updateWebpackBuilderWorkspaceConfigRule(
  projectSourceRoot: string,
  options: SSROptions,
): Rule {
  return updateWorkspace((workspace) => {
    const projectName = options.project;
    const project = workspace.projects.get(projectName);
    if (!project) {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const serverTarget = project.targets.get('server')!;
    (serverTarget.options ??= {}).main = posix.join(projectSourceRoot, 'server.ts');

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
    const serverFilePath = 'src/server.ts';
    if (Array.isArray(filesAstNode) && !filesAstNode.some(({ text }) => text === serverFilePath)) {
      tsConfig.modify(['files'], [...filesAstNode, serverFilePath]);
    }
  };
}

function addDependencies({ skipInstall }: SSROptions, isUsingApplicationBuilder: boolean): Rule {
  const install = skipInstall ? InstallBehavior.None : InstallBehavior.Auto;

  const rules: Rule[] = [
    addDependency('express', latestVersions['express'], {
      type: DependencyType.Default,
      install,
    }),
    addDependency('@types/express', latestVersions['@types/express'], {
      type: DependencyType.Dev,
      install,
    }),
  ];

  if (!isUsingApplicationBuilder) {
    rules.push(
      addDependency('browser-sync', latestVersions['browser-sync'], {
        type: DependencyType.Dev,
        install,
      }),
    );
  }

  return chain(rules);
}

function addServerFile(
  projectSourceRoot: string,
  options: ServerOptions,
  isStandalone: boolean,
): Rule {
  return async (host) => {
    const projectName = options.project;
    const workspace = await readWorkspace(host);
    const project = workspace.projects.get(projectName);
    if (!project) {
      throw new SchematicsException(`Invalid project name (${projectName})`);
    }
    const usingApplicationBuilder = isUsingApplicationBuilder(project);
    const browserDistDirectory = usingApplicationBuilder
      ? (await getApplicationBuilderOutputPaths(host, projectName)).browser
      : await getLegacyOutputPaths(host, projectName, 'build');

    return mergeWith(
      apply(url(`./files/${usingApplicationBuilder ? 'application-builder' : 'server-builder'}`), [
        applyTemplates({
          ...strings,
          ...options,
          browserDistDirectory,
          isStandalone,
        }),
        move(projectSourceRoot),
      ]),
    );
  };
}

export default function (options: SSROptions): Rule {
  return async (host, context) => {
    const browserEntryPoint = await getMainFilePath(host, options.project);
    const isStandalone = isStandaloneApp(host, browserEntryPoint);

    const workspace = await getWorkspace(host);
    const clientProject = workspace.projects.get(options.project);
    if (!clientProject) {
      throw targetBuildNotFoundError();
    }

    const usingApplicationBuilder = isUsingApplicationBuilder(clientProject);
    const sourceRoot = clientProject.sourceRoot ?? posix.join(clientProject.root, 'src');

    return chain([
      schematic('server', {
        ...options,
        skipInstall: true,
      }),
      ...(usingApplicationBuilder
        ? [
            updateApplicationBuilderWorkspaceConfigRule(sourceRoot, options, context),
            updateApplicationBuilderTsConfigRule(options),
          ]
        : [
            updateWebpackBuilderServerTsConfigRule(options),
            updateWebpackBuilderWorkspaceConfigRule(sourceRoot, options),
          ]),
      addServerFile(sourceRoot, options, isStandalone),
      addScriptsRule(options, usingApplicationBuilder),
      addDependencies(options, usingApplicationBuilder),
    ]);
  };
}
