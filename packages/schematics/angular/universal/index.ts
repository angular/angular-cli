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
import {
  NodeDependencyType,
  addPackageJsonDependency,
  getPackageJsonDependency,
} from '../utility/dependencies';
import { latestVersions } from '../utility/latest-versions';
import { relativePathToWorkspaceRoot } from '../utility/paths';
import { targetBuildNotFoundError } from '../utility/project-targets';
import { getWorkspace, updateWorkspace } from '../utility/workspace';
import { BrowserBuilderOptions, Builders } from '../utility/workspace-models';
import { Schema as UniversalOptions } from './schema';

function updateConfigFile(options: UniversalOptions, tsConfigDirectory: Path): Rule {
  return updateWorkspace((workspace) => {
    const clientProject = workspace.projects.get(options.project);

    if (clientProject) {
      // In case the browser builder hashes the assets
      // we need to add this setting to the server builder
      // as otherwise when assets it will be requested twice.
      // One for the server which will be unhashed, and other on the client which will be hashed.
      const getServerOptions = (options: Record<string, JsonValue | undefined> = {}): {} => {
        return {
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

      const mainPath = options.main as string;
      const sourceRoot = clientProject.sourceRoot ?? join(normalize(clientProject.root), 'src');
      const serverTsConfig = join(tsConfigDirectory, 'tsconfig.server.json');
      clientProject.targets.add({
        name: 'server',
        builder: Builders.Server,
        defaultConfiguration: 'production',
        options: {
          outputPath: `dist/${options.project}/server`,
          main: join(normalize(sourceRoot), mainPath.endsWith('.ts') ? mainPath : mainPath + '.ts'),
          tsConfig: serverTsConfig,
          ...(buildTarget?.options ? getServerOptions(buildTarget?.options) : {}),
        },
        configurations,
      });
    }
  });
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

export default function (options: UniversalOptions): Rule {
  return async (host: Tree, context: SchematicContext) => {
    const workspace = await getWorkspace(host);

    const clientProject = workspace.projects.get(options.project);
    if (!clientProject || clientProject.extensions.projectType !== 'application') {
      throw new SchematicsException(`Universal requires a project type of "application".`);
    }

    const clientBuildTarget = clientProject.targets.get('build');
    if (!clientBuildTarget) {
      throw targetBuildNotFoundError();
    }

    const clientBuildOptions = (clientBuildTarget.options ||
      {}) as unknown as BrowserBuilderOptions;

    if (!options.skipInstall) {
      context.addTask(new NodePackageInstallTask());
    }

    const templateSource = apply(url('./files/src'), [
      applyTemplates({
        ...strings,
        ...options,
        stripTsExtension: (s: string) => s.replace(/\.ts$/, ''),
      }),
      move(join(normalize(clientProject.root), 'src')),
    ]);

    const clientTsConfig = normalize(clientBuildOptions.tsConfig);
    const tsConfigExtends = basename(clientTsConfig);
    const tsConfigDirectory = dirname(clientTsConfig);

    const rootSource = apply(url('./files/root'), [
      applyTemplates({
        ...strings,
        ...options,
        stripTsExtension: (s: string) => s.replace(/\.ts$/, ''),
        tsConfigExtends,
        hasLocalizePackage: !!getPackageJsonDependency(host, '@angular/localize'),
        relativePathToWorkspaceRoot: relativePathToWorkspaceRoot(tsConfigDirectory),
      }),
      move(tsConfigDirectory),
    ]);

    return chain([
      mergeWith(templateSource),
      mergeWith(rootSource),
      addDependencies(),
      updateConfigFile(options, tsConfigDirectory),
    ]);
  };
}
