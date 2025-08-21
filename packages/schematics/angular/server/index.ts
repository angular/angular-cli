/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { JsonValue, Path, basename, dirname, join, normalize } from '@angular-devkit/core';
import {
  Rule,
  SchematicsException,
  Tree,
  apply,
  applyTemplates,
  chain,
  mergeWith,
  move,
  noop,
  strings,
  url,
} from '@angular-devkit/schematics';
import { posix } from 'node:path';
import { DependencyType, InstallBehavior, addDependency, addRootProvider } from '../utility';
import { getPackageJsonDependency } from '../utility/dependencies';
import { JSONFile } from '../utility/json-file';
import { latestVersions } from '../utility/latest-versions';
import { isStandaloneApp } from '../utility/ng-ast-utils';
import { relativePathToWorkspaceRoot } from '../utility/paths';
import { createProjectSchematic } from '../utility/project';
import { isUsingApplicationBuilder, targetBuildNotFoundError } from '../utility/project-targets';
import { resolveBootstrappedComponentData } from '../utility/standalone/app_component';
import { getMainFilePath } from '../utility/standalone/util';
import { updateWorkspace } from '../utility/workspace';
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
    if (!buildTarget) {
      return;
    }

    buildTarget.options ??= {};
    buildTarget.options['server'] = posix.join(
      project.sourceRoot ?? posix.join(project.root, 'src'),
      serverMainEntryName,
    );

    buildTarget.options['outputMode'] = 'static';
  });
}

function updateTsConfigFile(tsConfigPath: string): Rule {
  return (host: Tree) => {
    const json = new JSONFile(host, tsConfigPath);
    // Skip adding the files entry if the server entry would already be included.
    const include = json.get(['include']);
    if (!Array.isArray(include) || !include.includes('src/**/*.ts')) {
      const filesPath = ['files'];
      const files = new Set((json.get(filesPath) as string[] | undefined) ?? []);
      files.add('src/' + serverMainEntryName);
      json.modify(filesPath, [...files]);
    }

    const typePath = ['compilerOptions', 'types'];
    const types = new Set((json.get(typePath) as string[] | undefined) ?? []);
    types.add('node');
    json.modify(typePath, [...types]);
  };
}

function addDependencies(skipInstall: boolean | undefined): Rule {
  return (host: Tree) => {
    const coreDep = getPackageJsonDependency(host, '@angular/core');
    if (coreDep === null) {
      throw new SchematicsException('Could not find version.');
    }

    const install = skipInstall ? InstallBehavior.None : InstallBehavior.Auto;

    return chain([
      addDependency('@angular/ssr', latestVersions.AngularSSR, {
        type: DependencyType.Default,
        install,
      }),
      addDependency('@angular/platform-server', coreDep.version, {
        type: DependencyType.Default,
        install,
      }),
      addDependency('@types/node', latestVersions['@types/node'], {
        type: DependencyType.Dev,
        install,
      }),
    ]);
  };
}

export default createProjectSchematic<ServerOptions>(async (options, { project, tree }) => {
  if (project?.extensions.projectType !== 'application') {
    throw new SchematicsException(`Server schematic requires a project type of "application".`);
  }

  const clientBuildTarget = project.targets.get('build');
  if (!clientBuildTarget) {
    throw targetBuildNotFoundError();
  }

  const usingApplicationBuilder = isUsingApplicationBuilder(project);

  if (
    project.targets.has('server') ||
    (usingApplicationBuilder && clientBuildTarget.options?.server !== undefined)
  ) {
    // Server has already been added.
    return noop();
  }

  const clientBuildOptions = clientBuildTarget.options as Record<string, string>;
  const browserEntryPoint = await getMainFilePath(tree, options.project);
  const isStandalone = isStandaloneApp(tree, browserEntryPoint);
  const sourceRoot = project.sourceRoot ?? join(normalize(project.root), 'src');

  let filesUrl = `./files/${usingApplicationBuilder ? 'application-builder/' : 'server-builder/'}`;
  filesUrl += isStandalone ? 'standalone-src' : 'ngmodule-src';

  const { componentName, componentImportPathInSameFile, moduleName, moduleImportPathInSameFile } =
    resolveBootstrappedComponentData(tree, browserEntryPoint) || {
      componentName: 'App',
      componentImportPathInSameFile: './app/app',
      moduleName: 'AppModule',
      moduleImportPathInSameFile: './app/app.module',
    };
  const templateSource = apply(url(filesUrl), [
    applyTemplates({
      ...strings,
      ...options,
      appComponentName: componentName,
      appComponentPath: componentImportPathInSameFile,
      appModuleName: moduleName,
      appModulePath:
        moduleImportPathInSameFile === null
          ? null
          : `./${posix.basename(moduleImportPathInSameFile)}`,
    }),
    move(sourceRoot),
  ]);

  const clientTsConfig = normalize(clientBuildOptions.tsConfig);
  const tsConfigExtends = basename(clientTsConfig);
  const tsConfigDirectory = dirname(clientTsConfig);

  return chain([
    mergeWith(templateSource),
    ...(usingApplicationBuilder
      ? [
          updateConfigFileApplicationBuilder(options),
          updateTsConfigFile(clientBuildOptions.tsConfig),
        ]
      : [
          mergeWith(
            apply(url('./files/server-builder/root'), [
              applyTemplates({
                ...strings,
                ...options,
                stripTsExtension: (s: string) => s.replace(/\.ts$/, ''),
                tsConfigExtends,
                hasLocalizePackage: !!getPackageJsonDependency(tree, '@angular/localize'),
                relativePathToWorkspaceRoot: relativePathToWorkspaceRoot(tsConfigDirectory),
              }),
              move(tsConfigDirectory),
            ]),
          ),
          updateConfigFileBrowserBuilder(options, tsConfigDirectory),
        ]),
    addDependencies(options.skipInstall),
    addRootProvider(
      options.project,
      ({ code, external }) =>
        code`${external('provideClientHydration', '@angular/platform-browser')}(${external(
          'withEventReplay',
          '@angular/platform-browser',
        )}())`,
    ),
  ]);
});
