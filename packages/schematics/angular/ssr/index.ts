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
import { targetBuildNotFoundError } from '../utility/project-targets';
import { getMainFilePath } from '../utility/standalone/util';
import { getWorkspace } from '../utility/workspace';
import { Builders } from '../utility/workspace-models';

import { Schema as SSROptions } from './schema';

const DEFAULT_BROWSER_DIR = 'browser';
const DEFAULT_MEDIA_DIR = 'media';
const DEFAULT_SERVER_DIR = 'server';

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
      `outputPath for ${projectName} ${target} target is undeined or null.`,
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

function addScriptsRule({ project }: SSROptions): Rule {
  return async (host) => {
    const pkgPath = '/package.json';
    const pkg = host.readJson(pkgPath) as { scripts?: Record<string, string> } | null;
    if (pkg === null) {
      throw new SchematicsException('Could not find package.json');
    }

    const { base, server } = await getApplicationBuilderOutputPaths(host, project);
    pkg.scripts ??= {};
    pkg.scripts[`serve:ssr:${project}`] = `node ${posix.join(base, server)}/server.mjs`;

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
      prerender: true,
      ssr: {
        entry: join(normalize(projectRoot), 'server.ts'),
      },
    };
  });
}

function addServerFile(options: ServerOptions, isStandalone: boolean): Rule {
  return async (host) => {
    const projectName = options.project;
    const workspace = await readWorkspace(host);
    const project = workspace.projects.get(projectName);
    if (!project) {
      throw new SchematicsException(`Invalid project name (${projectName})`);
    }

    const buildTarget = project.targets.get('build');
    if (
      buildTarget?.builder !== Builders.Application &&
      buildTarget?.builder !== Builders.BuildApplication
    ) {
      throw new SchematicsException(
        `Ssr schematic requires the project to use "${Builders.Application}" or "${Builders.BuildApplication}" as the build builder.`,
      );
    }

    const browserDistDirectory = (await getApplicationBuilderOutputPaths(host, projectName))
      .browser;

    return mergeWith(
      apply(url('./files/'), [
        applyTemplates({
          ...strings,
          ...options,
          browserDistDirectory,
          isStandalone,
        }),
        move(project.root),
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

    const install = options.skipInstall ? InstallBehavior.None : InstallBehavior.Auto;

    return chain([
      schematic('server', {
        ...options,
        skipInstall: true,
      }),
      updateApplicationBuilderWorkspaceConfigRule(clientProject.root, options, context),
      updateApplicationBuilderTsConfigRule(options),
      addServerFile(options, isStandalone),
      addScriptsRule(options),
      addDependency('express', latestVersions['express'], {
        type: DependencyType.Default,
        install,
      }),
      addDependency('@types/express', latestVersions['@types/express'], {
        type: DependencyType.Dev,
        install,
      }),
    ]);
  };
}
