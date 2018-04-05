/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonObject, experimental, normalize, parseJson, strings } from '@angular-devkit/core';
import {
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
  apply,
  chain,
  mergeWith,
  move,
  template,
  url,
} from '@angular-devkit/schematics';
import * as ts from 'typescript';
import { findNode, getDecoratorMetadata } from '../utility/ast-utils';
import { InsertChange } from '../utility/change';
import { getWorkspace } from '../utility/config';
import { findBootstrapModuleCall, findBootstrapModulePath } from '../utility/ng-ast-utils';
import { Schema as UniversalOptions } from './schema';


function getWorkspacePath(host: Tree): string {
  const possibleFiles = [ '/angular.json', '/.angular.json' ];

  return possibleFiles.filter(path => host.exists(path))[0];
}

function getClientProject(host: Tree, options: UniversalOptions): experimental.workspace.Project {
  const workspace = getWorkspace(host);
  const clientProject = workspace.projects[options.clientProject];
  if (!clientProject) {
    throw new SchematicsException(`Client app ${options.clientProject} not found.`);
  }

  return clientProject;
}

function getClientArchitect(
  host: Tree,
  options: UniversalOptions,
): experimental.workspace.Architect {
  const clientArchitect = getClientProject(host, options).architect;

  if (!clientArchitect) {
    throw new Error('Client project architect not found.');
  }

  return clientArchitect;
}

function updateConfigFile(options: UniversalOptions): Rule {
  return (host: Tree) => {
    const builderOptions: JsonObject = {
      outputPath: `dist/${options.clientProject}-server`,
      main: `projects/${options.clientProject}/src/main.server.ts`,
      tsConfig: `projects/${options.clientProject}/tsconfig.server.json`,
    };
    const serverTarget: JsonObject = {
      builder: '@angular-devkit/build-angular:server',
      options: builderOptions,
    };
    const workspace = getWorkspace(host);

    if (!workspace.projects[options.clientProject]) {
      throw new SchematicsException(`Client app ${options.clientProject} not found.`);
    }
    const clientProject = workspace.projects[options.clientProject];
    if (!clientProject.architect) {
      throw new Error('Client project architect not found.');
    }
    clientProject.architect.server = serverTarget;

    const workspacePath = getWorkspacePath(host);

    host.overwrite(workspacePath, JSON.stringify(workspace, null, 2));

    return host;
  };
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

function wrapBootstrapCall(options: UniversalOptions): Rule {
  return (host: Tree) => {
    const clientArchitect = getClientArchitect(host, options);
    const mainPath = normalize('/' + clientArchitect.build.options.main);
    let bootstrapCall: ts.Node | null = findBootstrapModuleCall(host, mainPath);
    if (bootstrapCall === null) {
      throw new SchematicsException('Bootstrap module not found.');
    }

    let bootstrapCallExpression: ts.Node | null = null;
    let currentCall = bootstrapCall;
    while (bootstrapCallExpression === null && currentCall.parent) {
      currentCall = currentCall.parent;
      if (currentCall.kind === ts.SyntaxKind.ExpressionStatement) {
        bootstrapCallExpression = currentCall;
      }
    }
    bootstrapCall = currentCall;

    const recorder = host.beginUpdate(mainPath);
    const beforeText = `document.addEventListener('DOMContentLoaded', () => {\n  `;
    const afterText = `\n});`;
    recorder.insertLeft(bootstrapCall.getStart(), beforeText);
    recorder.insertRight(bootstrapCall.getEnd(), afterText);
    host.commitUpdate(recorder);
  };
}

function addServerTransition(options: UniversalOptions): Rule {
  return (host: Tree) => {
    const clientProject = getClientProject(host, options);
    const clientArchitect = getClientArchitect(host, options);
    const mainPath = normalize('/' + clientArchitect.build.options.main);

    const bootstrapModuleRelativePath = findBootstrapModulePath(host, mainPath);
    const bootstrapModulePath = normalize(
      `/${clientProject.root}/src/${bootstrapModuleRelativePath}.ts`);

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
    const pkgPath = '/package.json';
    const buffer = host.read(pkgPath);
    if (buffer === null) {
      throw new SchematicsException('Could not find package.json');
    }

    const pkg = JSON.parse(buffer.toString());

    const ngCoreVersion = pkg.dependencies['@angular/core'];
    pkg.dependencies['@angular/platform-server'] = ngCoreVersion;

    host.overwrite(pkgPath, JSON.stringify(pkg, null, 2));

    return host;
  };
}

function getTsConfigOutDir(host: Tree, architect: experimental.workspace.Architect): string {
  const tsConfigPath = architect.build.options.tsConfig;
  const tsConfigBuffer = host.read(tsConfigPath);
  if (!tsConfigBuffer) {
    throw new SchematicsException(`Could not read ${tsConfigPath}`);
  }
  const tsConfigContent = tsConfigBuffer.toString();
  const tsConfig = parseJson(tsConfigContent);
  if (tsConfig === null || typeof tsConfig !== 'object' || Array.isArray(tsConfig) ||
      tsConfig.compilerOptions === null || typeof tsConfig.compilerOptions !== 'object' ||
      Array.isArray(tsConfig.compilerOptions)) {
    throw new SchematicsException(`Invalid tsconfig - ${tsConfigPath}`);
  }
  const outDir = tsConfig.compilerOptions.outDir;

  return outDir as string;
}

export default function (options: UniversalOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    const clientProject = getClientProject(host, options);
    const clientArchitect = getClientArchitect(host, options);
    const outDir = getTsConfigOutDir(host, clientArchitect);
    const templateSource = apply(url('./files'), [
      template({
        ...strings,
        ...options as object,
        stripTsExtension: (s: string) => { return s.replace(/\.ts$/, ''); },
        outDir,
      }),
      move(clientProject.root),
    ]);

    return chain([
      mergeWith(templateSource),
      addDependencies(),
      updateConfigFile(options),
      wrapBootstrapCall(options),
      addServerTransition(options),
    ])(host, context);
  };
}
