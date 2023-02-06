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
import * as ts from '../third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { findNode, getDecoratorMetadata } from '../utility/ast-utils';
import {
  NodeDependencyType,
  addPackageJsonDependency,
  getPackageJsonDependency,
} from '../utility/dependencies';
import { latestVersions } from '../utility/latest-versions';
import { findBootstrapModulePath } from '../utility/ng-ast-utils';
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

function findBrowserModuleImport(host: Tree, modulePath: string): ts.Node {
  const moduleFileText = host.readText(modulePath);
  const source = ts.createSourceFile(modulePath, moduleFileText, ts.ScriptTarget.Latest, true);

  const decoratorMetadata = getDecoratorMetadata(source, 'NgModule', '@angular/core')[0];
  const browserModuleNode = findNode(decoratorMetadata, ts.SyntaxKind.Identifier, 'BrowserModule');

  if (browserModuleNode === null) {
    throw new SchematicsException(`Cannot find BrowserModule import in ${modulePath}`);
  }

  return browserModuleNode;
}

function addServerTransition(
  options: UniversalOptions,
  mainFile: string,
  clientProjectRoot: string,
): Rule {
  return (host: Tree) => {
    const mainPath = normalize('/' + mainFile);

    const bootstrapModuleRelativePath = findBootstrapModulePath(host, mainPath);
    const bootstrapModulePath = normalize(
      `/${clientProjectRoot}/src/${bootstrapModuleRelativePath}.ts`,
    );

    const browserModuleImport = findBrowserModuleImport(host, bootstrapModulePath);
    const transitionCallRecorder = host.beginUpdate(bootstrapModulePath);
    const position = browserModuleImport.pos + browserModuleImport.getFullWidth();
    const browserModuleFullImport = browserModuleImport.parent;

    if (browserModuleFullImport.getText() === 'BrowserModule.withServerTransition') {
      // Remove any existing withServerTransition as otherwise we might have incorrect configuration.
      transitionCallRecorder.remove(
        position,
        browserModuleFullImport.parent.getFullWidth() - browserModuleImport.getFullWidth(),
      );
    }

    transitionCallRecorder.insertLeft(
      position,
      `.withServerTransition({ appId: '${options.appId}' })`,
    );
    host.commitUpdate(transitionCallRecorder);
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
      addServerTransition(options, clientBuildOptions.main, clientProject.root),
    ]);
  };
}
