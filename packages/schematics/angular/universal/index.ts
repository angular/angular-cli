/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  JsonValue,
  Path,
  basename,
  join,
  normalize,
  strings,
} from '@angular-devkit/core';
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
  url,
} from '@angular-devkit/schematics';
import {
  NodePackageInstallTask,
} from '@angular-devkit/schematics/tasks';
import * as ts from '../third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { findNode, getDecoratorMetadata } from '../utility/ast-utils';
import { InsertChange } from '../utility/change';
import { addPackageJsonDependency, getPackageJsonDependency } from '../utility/dependencies';
import { findBootstrapModuleCall, findBootstrapModulePath } from '../utility/ng-ast-utils';
import { relativePathToWorkspaceRoot } from '../utility/paths';
import { targetBuildNotFoundError } from '../utility/project-targets';
import { getWorkspace, updateWorkspace } from '../utility/workspace';
import { BrowserBuilderOptions, Builders } from '../utility/workspace-models';
import { Schema as UniversalOptions } from './schema';

function updateConfigFile(options: UniversalOptions, tsConfigDirectory: Path): Rule {
  return updateWorkspace(workspace => {
    const clientProject = workspace.projects.get(options.clientProject);

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
        };
      };

      const buildTarget = clientProject.targets.get('build');
      if (buildTarget?.options) {
        buildTarget.options.outputPath = `dist/${options.clientProject}/browser`;
      }

      const buildConfigurations = buildTarget?.configurations;
      const configurations: Record<string, {}> = {};
      if (buildConfigurations) {
        for (const [key, options] of Object.entries(buildConfigurations)) {
          configurations[key] = getServerOptions(options);
        }
      }

      const mainPath = options.main as string;
      const serverTsConfig = join(tsConfigDirectory, 'tsconfig.server.json');
      clientProject.targets.add({
        name: 'server',
        builder: Builders.Server,
        defaultConfiguration: 'production',
        options: {
          outputPath: `dist/${options.clientProject}/server`,
          main: join(normalize(clientProject.root), 'src', mainPath.endsWith('.ts') ? mainPath : mainPath + '.ts'),
          tsConfig: serverTsConfig,
          ...(buildTarget?.options ? getServerOptions(buildTarget?.options) : {}),
        },
        configurations,
      });
    }
  });
}

function findBrowserModuleImport(host: Tree, modulePath: string): ts.Node {
  const moduleBuffer = host.read(modulePath);
  if (!moduleBuffer) {
    throw new SchematicsException(`Module file (${modulePath}) not found`);
  }
  const moduleFileText = moduleBuffer.toString('utf-8');

  const source = ts.createSourceFile(modulePath, moduleFileText, ts.ScriptTarget.Latest, true);

  const decoratorMetadata = getDecoratorMetadata(source, 'NgModule', '@angular/core')[0];
  const browserModuleNode = findNode(decoratorMetadata, ts.SyntaxKind.Identifier, 'BrowserModule');

  if (browserModuleNode === null) {
    throw new SchematicsException(`Cannot find BrowserModule import in ${modulePath}`);
  }

  return browserModuleNode;
}

function wrapBootstrapCall(mainFile: string): Rule {
  return (host: Tree) => {
    const mainPath = normalize('/' + mainFile);
    let bootstrapCall: ts.Node | null = findBootstrapModuleCall(host, mainPath);
    if (bootstrapCall === null) {
      throw new SchematicsException('Bootstrap module not found.');
    }

    let bootstrapCallExpression: ts.Node | null = null;
    let currentCall = bootstrapCall;
    while (bootstrapCallExpression === null && currentCall.parent) {
      currentCall = currentCall.parent;
      if (ts.isExpressionStatement(currentCall) || ts.isVariableStatement(currentCall)) {
        bootstrapCallExpression = currentCall;
      }
    }
    bootstrapCall = currentCall;

    // In case the bootstrap code is a variable statement
    // we need to determine it's usage
    if (bootstrapCallExpression && ts.isVariableStatement(bootstrapCallExpression)) {
      const declaration = bootstrapCallExpression.declarationList.declarations[0];
      const bootstrapVar = (declaration.name as ts.Identifier).text;
      const sf = bootstrapCallExpression.getSourceFile();
      bootstrapCall = findCallExpressionNode(sf, bootstrapVar) || currentCall;
    }

    // indent contents
    const triviaWidth = bootstrapCall.getLeadingTriviaWidth();
    const beforeText = `document.addEventListener('DOMContentLoaded', () => {\n`
      + ' '.repeat(triviaWidth > 2 ? triviaWidth + 1 : triviaWidth);
    const afterText = `\n${triviaWidth > 2 ? ' '.repeat(triviaWidth - 1) : ''}});`;

    // in some cases we need to cater for a trailing semicolon such as;
    // bootstrap().catch(err => console.log(err));
    const lastToken = bootstrapCall.parent.getLastToken();
    let endPos = bootstrapCall.getEnd();
    if (lastToken && lastToken.kind === ts.SyntaxKind.SemicolonToken) {
      endPos = lastToken.getEnd();
    }

    const recorder = host.beginUpdate(mainPath);
    recorder.insertLeft(bootstrapCall.getStart(), beforeText);
    recorder.insertRight(endPos, afterText);
    host.commitUpdate(recorder);
  };
}

function findCallExpressionNode(node: ts.Node, text: string): ts.Node | null {
  if (
    ts.isCallExpression(node)
    && ts.isIdentifier(node.expression)
    && node.expression.text === text
  ) {
    return node;
  }

  let foundNode: ts.Node | null = null;
  ts.forEachChild(node, childNode => {
    foundNode = findCallExpressionNode(childNode, text);

    if (foundNode) {
      return true;
    }
  });

  return foundNode;
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
      `/${clientProjectRoot}/src/${bootstrapModuleRelativePath}.ts`);

    const browserModuleImport = findBrowserModuleImport(host, bootstrapModulePath);
    const appId = options.appId;
    const transitionCall = `.withServerTransition({ appId: '${appId}' })`;
    const position = browserModuleImport.pos + browserModuleImport.getFullText().length;
    const transitionCallChange = new InsertChange(
      bootstrapModulePath, position, transitionCall);

    const transitionCallRecorder = host.beginUpdate(bootstrapModulePath);
    transitionCallRecorder.insertLeft(transitionCallChange.pos, transitionCallChange.toAdd);
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

    return host;
  };
}

export default function (options: UniversalOptions): Rule {
  return async (host: Tree, context: SchematicContext) => {
    const workspace = await getWorkspace(host);

    const clientProject = workspace.projects.get(options.clientProject);
    if (!clientProject || clientProject.extensions.projectType !== 'application') {
      throw new SchematicsException(`Universal requires a project type of "application".`);
    }

    const clientBuildTarget = clientProject.targets.get('build');
    if (!clientBuildTarget) {
      throw targetBuildNotFoundError();
    }

    const clientBuildOptions =
      (clientBuildTarget.options || {}) as unknown as BrowserBuilderOptions;

    const clientTsConfig = normalize(clientBuildOptions.tsConfig);
    const tsConfigExtends = basename(clientTsConfig);
    // this is needed because prior to version 8, tsconfig might have been in 'src'
    // and we don't want to break the 'ng add @nguniversal/express-engine schematics'
    const rootInSrc = clientProject.root === '' && clientTsConfig.includes('src/');
    const tsConfigDirectory = join(normalize(clientProject.root), rootInSrc ? 'src' : '');

    if (!options.skipInstall) {
      context.addTask(new NodePackageInstallTask());
    }

    const templateSource = apply(url('./files/src'), [
      applyTemplates({
        ...strings,
        ...options as object,
        stripTsExtension: (s: string) => s.replace(/\.ts$/, ''),
        hasLocalizePackage: !!getPackageJsonDependency(host, '@angular/localize'),
      }),
      move(join(normalize(clientProject.root), 'src')),
    ]);

    const rootSource = apply(url('./files/root'), [
      applyTemplates({
        ...strings,
        ...options as object,
        stripTsExtension: (s: string) => s.replace(/\.ts$/, ''),
        tsConfigExtends,
        relativePathToWorkspaceRoot: relativePathToWorkspaceRoot(tsConfigDirectory),
        rootInSrc,
      }),
      move(tsConfigDirectory),
    ]);

    return chain([
      mergeWith(templateSource),
      mergeWith(rootSource),
      addDependencies(),
      updateConfigFile(options, tsConfigDirectory),
      wrapBootstrapCall(clientBuildOptions.main),
      addServerTransition(options, clientBuildOptions.main, clientProject.root),
    ]);
  };
}
