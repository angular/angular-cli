/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { normalize } from '@angular-devkit/core';
import {
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
  apply,
  chain,
  mergeWith,
  template,
  url,
} from '@angular-devkit/schematics';
import 'rxjs/add/operator/merge';
import * as ts from 'typescript';
import * as stringUtils from '../strings';
import { findNode, getDecoratorMetadata } from '../utility/ast-utils';
import { InsertChange } from '../utility/change';
import { AppConfig, getAppFromConfig, getConfig } from '../utility/config';
import { findBootstrapModuleCall, findBootstrapModulePath } from '../utility/ng-ast-utils';
import { Schema as UniversalOptions } from './schema';


function updateConfigFile(options: UniversalOptions): Rule {
  return (host: Tree) => {
    const config = getConfig(host);
    const clientApp = getAppFromConfig(config, options.clientApp || '0');
    if (clientApp === null) {
      throw new SchematicsException('Client app not found.');
    }
    options.test = options.test || clientApp.test;

    const tsCfg = options.tsconfigFileName && options.tsconfigFileName.endsWith('.json')
      ? options.tsconfigFileName : `${options.tsconfigFileName}.json`;
    const testTsCfg = options.testTsconfigFileName && options.testTsconfigFileName.endsWith('.json')
      ? options.testTsconfigFileName : `${options.testTsconfigFileName}.json`;

    const serverApp: AppConfig = {
      ...clientApp,
      platform: 'server',
      root: options.root,
      outDir: options.outDir,
      index: options.index,
      main: options.main,
      test: options.test,
      tsconfig: tsCfg,
      testTsconfig: testTsCfg,
    };
    if (options.name) {
      serverApp.name = options.name;
    }
    if (!config.apps) {
      config.apps = [];
    }
    config.apps.push(serverApp);

    host.overwrite('/.angular-cli.json', JSON.stringify(config, null, 2));

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
    const config = getConfig(host);
    const clientApp = getAppFromConfig(config, options.clientApp || '0');
    if (clientApp === null) {
      throw new SchematicsException('Client app not found.');
    }
    const mainPath = normalize(`/${clientApp.root}/${clientApp.main}`);
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
    const config = getConfig(host);
    const clientApp = getAppFromConfig(config, options.clientApp || '0');
    if (clientApp === null) {
      throw new SchematicsException('Client app not found.');
    }
    const mainPath = normalize(`/${clientApp.root}/${clientApp.main}`);

    const bootstrapModuleRelativePath = findBootstrapModulePath(host, mainPath);
    const bootstrapModulePath = normalize(`/${clientApp.root}/${bootstrapModuleRelativePath}.ts`);

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

export default function (options: UniversalOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    const templateSource = apply(url('./files'), [
      template({
        ...stringUtils,
        ...options as object,
        stripTsExtension: (s: string) => { return s.replace(/\.ts$/, ''); },
      }),
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
