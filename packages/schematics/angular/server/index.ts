/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { JsonValue, Path, basename, dirname, join, normalize } from '@angular-devkit/core';
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
  strings,
  url,
} from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { posix } from 'node:path';
import {
  NodeDependencyType,
  addPackageJsonDependency,
  getPackageJsonDependency,
} from '../utility/dependencies';
import { JSONFile } from '../utility/json-file';
import { latestVersions } from '../utility/latest-versions';
import { isStandaloneApp } from '../utility/ng-ast-utils';
import { relativePathToWorkspaceRoot } from '../utility/paths';
import { targetBuildNotFoundError } from '../utility/project-targets';
import { getMainFilePath } from '../utility/standalone/util';
import { getWorkspace, updateWorkspace } from '../utility/workspace';
import { Builders } from '../utility/workspace-models';
import { Schema as ServerOptions } from './schema';

const serverMainEntryName = 'main.server.ts';

function updateConfigFileBrowserBuilder(options: ServerOptions, tsConfigDirectory: Path): Rule {
  return updateWorkspace((workspace) => {
    const clientProject = workspace.projects.get(options.project);

    if (clientProject) {
      // In case the browser builder hashes the assets
      // we need to add this setting to the server builder
      // as otherwise when assets it will be requested twice.
      // One for the server which will be unhashed, and other on the client which will be hashed.
      const getServerOptions = (options: Record<string, JsonValue | undefined> = {}): {} => {
        return {
          buildOptimizer: options?.buildOptimizer,
          outputHashing: options?.outputHashing === 'all' ? 'media' : options?.outputHashing,
          fileReplacements: options?.fileReplacements,
          optimization: options?.optimization === undefined ? undefined : !!options?.optimization,
          sourceMap: options?.sourceMap,
          localization: options?.localization,
          stylePreprocessorOptions: options?.stylePreprocessorOptions,
          resourcesOutputPath: options?.resourcesOutputPath,
          deployUrl: options?.deployUrl,
          i18nMissingTranslation: options?.i18nMissingTranslation,
          preserveSymlinks: options?.preserveSymlinks,
          extractLicenses: options?.extractLicenses,
          inlineStyleLanguage: options?.inlineStyleLanguage,
          vendorChunk: options?.vendorChunk,
        };
      };

      const buildTarget = clientProject.targets.get('build');
      if (buildTarget?.options) {
        buildTarget.options.outputPath = `dist/${options.project}/browser`;
      }

      const buildConfigurations = buildTarget?.configurations;
      const configurations: Record<string, {}> = {};
      if (buildConfigurations) {
        for (const [key, options] of Object.entries(buildConfigurations)) {
          configurations[key] = getServerOptions(options);
        }
      }

      const sourceRoot = clientProject.sourceRoot ?? join(normalize(clientProject.root), 'src');
      const serverTsConfig = join(tsConfigDirectory, 'tsconfig.server.json');
      clientProject.targets.add({
        name: 'server',
        builder: Builders.Server,
        defaultConfiguration: 'production',
        options: {
          outputPath: `dist/${options.project}/server`,
          main: join(normalize(sourceRoot), serverMainEntryName),
          tsConfig: serverTsConfig,
          ...(buildTarget?.options ? getServerOptions(buildTarget?.options) : {}),
        },
        configurations,
      });
    }
  });
}

function updateConfigFileApplicationBuilder(options: ServerOptions): Rule {
  return updateWorkspace((workspace) => {
    const project = workspace.projects.get(options.project);
    if (!project) {
      return;
    }

    const buildTarget = project.targets.get('build');
    if (buildTarget?.builder !== Builders.Application) {
      throw new SchematicsException(
        `This schematic requires "${Builders.Application}" to be used as a build builder.`,
      );
    }

    buildTarget.options ??= {};
    buildTarget.options['server'] = posix.join(
      project.sourceRoot ?? posix.join(project.root, 'src'),
      serverMainEntryName,
    );
  });
}

function updateTsConfigFile(tsConfigPath: string): Rule {
  return (host: Tree) => {
    const json = new JSONFile(host, tsConfigPath);
    const filesPath = ['files'];
    const files = new Set((json.get(filesPath) as string[] | undefined) ?? []);
    files.add('src/' + serverMainEntryName);
    json.modify(filesPath, [...files]);

    const typePath = ['compilerOptions', 'types'];
    const types = new Set((json.get(typePath) as string[] | undefined) ?? []);
    types.add('node');
    json.modify(typePath, [...types]);
  };
}

function addDependencies(): Rule {
  return (host: Tree) => {
    const coreDep = getPackageJsonDependency(host, '@angular/core');
    if (coreDep === null) {
      throw new SchematicsException('Could not find version.');
    }
    const platformServerDep = {
      ...coreDep,
      name: '@angular/platform-server',
    };
    addPackageJsonDependency(host, platformServerDep);

    addPackageJsonDependency(host, {
      type: NodeDependencyType.Dev,
      name: '@types/node',
      version: latestVersions['@types/node'],
    });
  };
}

export default function (options: ServerOptions): Rule {
  return async (host: Tree, context: SchematicContext) => {
    const workspace = await getWorkspace(host);
    const clientProject = workspace.projects.get(options.project);
    if (clientProject?.extensions.projectType !== 'application') {
      throw new SchematicsException(`Server schematic requires a project type of "application".`);
    }

    const clientBuildTarget = clientProject.targets.get('build');
    if (!clientBuildTarget) {
      throw targetBuildNotFoundError();
    }

    const isUsingApplicationBuilder = clientBuildTarget.builder === Builders.Application;
    if (
      clientProject.targets.has('server') ||
      (isUsingApplicationBuilder && clientBuildTarget.options?.server !== undefined)
    ) {
      // Server has already been added.
      return;
    }

    if (!options.skipInstall) {
      context.addTask(new NodePackageInstallTask());
    }
    const clientBuildOptions = clientBuildTarget.options as Record<string, string>;
    const browserEntryPoint = await getMainFilePath(host, options.project);
    const isStandalone = isStandaloneApp(host, browserEntryPoint);

    const templateSource = apply(url(isStandalone ? './files/standalone-src' : './files/src'), [
      applyTemplates({
        ...strings,
        ...options,
      }),
      move(join(normalize(clientProject.root), 'src')),
    ]);

    const clientTsConfig = normalize(clientBuildOptions.tsConfig);
    const tsConfigExtends = basename(clientTsConfig);
    const tsConfigDirectory = dirname(clientTsConfig);

    return chain([
      mergeWith(templateSource),
      ...(isUsingApplicationBuilder
        ? [
            updateConfigFileApplicationBuilder(options),
            updateTsConfigFile(clientBuildOptions.tsConfig),
          ]
        : [
            mergeWith(
              apply(url('./files/root'), [
                applyTemplates({
                  ...strings,
                  ...options,
                  stripTsExtension: (s: string) => s.replace(/\.ts$/, ''),
                  tsConfigExtends,
                  hasLocalizePackage: !!getPackageJsonDependency(host, '@angular/localize'),
                  relativePathToWorkspaceRoot: relativePathToWorkspaceRoot(tsConfigDirectory),
                }),
                move(tsConfigDirectory),
              ]),
            ),
            updateConfigFileBrowserBuilder(options, tsConfigDirectory),
          ]),
      addDependencies(),
    ]);
  };
}
