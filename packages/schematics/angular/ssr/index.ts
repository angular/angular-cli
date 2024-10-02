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
import { targetBuildNotFoundError } from '../utility/project-targets';
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

function updateTsConfigFile(tsConfigPath: string): Rule {
  return (host: Tree) => {
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

function addServerFile(options: ServerOptions): Rule {
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
        }),
        move(project.sourceRoot ?? posix.join(project.root, 'src')),
      ]),
    );
  };
}

export default function (options: SSROptions): Rule {
  return async (host, context) => {
    const workspace = await getWorkspace(host);
    const clientProject = workspace.projects.get(options.project);
    if (!clientProject) {
      throw targetBuildNotFoundError();
    }
    const install = options.skipInstall ? InstallBehavior.None : InstallBehavior.Auto;

    const tsConfigPath = clientProject?.targets.get('build')?.options?.tsConfig;
    if (!tsConfigPath || typeof tsConfigPath !== 'string') {
      throw new SchematicsException(`'tsConfig' builder option must be defined as a string.`);
    }

    return chain([
      schematic('server', {
        ...options,
        skipInstall: true,
      }),
      updateApplicationBuilderWorkspaceConfigRule(
        clientProject.sourceRoot ?? posix.join(clientProject.root, 'src'),
        options,
        context,
      ),
      updateTsConfigFile(tsConfigPath),
      addServerFile(options),
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
