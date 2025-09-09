/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Rule, SchematicsException, Tree, chain, schematic } from '@angular-devkit/schematics';
import { dirname, join } from 'node:path/posix';
import ts from '../third_party/github.com/Microsoft/TypeScript/lib/typescript';
import {
  findNode,
  findNodes,
  getDecoratorMetadata,
  getSourceNodes,
  insertImport,
} from '../utility/ast-utils';
import { applyToUpdateRecorder } from '../utility/change';
import { getAppModulePath, isStandaloneApp } from '../utility/ng-ast-utils';
import { createProjectSchematic } from '../utility/project';
import { findBootstrapApplicationCall, getMainFilePath } from '../utility/standalone/util';
import { getWorkspace } from '../utility/workspace';
import { Schema as AppShellOptions } from './schema';

function getSourceFile(host: Tree, path: string): ts.SourceFile {
  const content = host.readText(path);
  const source = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true);

  return source;
}

function getServerModulePath(host: Tree, sourceRoot: string, mainPath: string): string | null {
  const mainSource = getSourceFile(host, join(sourceRoot, mainPath));
  const allNodes = getSourceNodes(mainSource);
  const expNode = allNodes.find((node) => ts.isExportDeclaration(node));
  if (!expNode) {
    return null;
  }
  const relativePath = expNode.moduleSpecifier as ts.StringLiteral;
  const modulePath = join(sourceRoot, `${relativePath.text}.ts`);

  return modulePath;
}

interface TemplateInfo {
  templateProp?: ts.PropertyAssignment;
  templateUrlProp?: ts.PropertyAssignment;
}

function getComponentTemplateInfo(host: Tree, componentPath: string): TemplateInfo {
  const compSource = getSourceFile(host, componentPath);
  const compMetadata = getDecoratorMetadata(compSource, 'Component', '@angular/core')[0];

  return {
    templateProp: getMetadataProperty(compMetadata, 'template'),
    templateUrlProp: getMetadataProperty(compMetadata, 'templateUrl'),
  };
}

function getComponentTemplate(host: Tree, compPath: string, tmplInfo: TemplateInfo): string {
  let template = '';

  if (tmplInfo.templateProp) {
    template = tmplInfo.templateProp.getFullText();
  } else if (tmplInfo.templateUrlProp) {
    const templateUrl = (tmplInfo.templateUrlProp.initializer as ts.StringLiteral).text;
    const dir = dirname(compPath);
    const templatePath = join(dir, templateUrl);
    try {
      template = host.readText(templatePath);
    } catch {}
  }

  return template;
}

function getBootstrapComponentPath(host: Tree, mainPath: string): string {
  let bootstrappingFilePath: string;
  let bootstrappingSource: ts.SourceFile;
  let componentName: string;

  if (isStandaloneApp(host, mainPath)) {
    // Standalone Application
    const bootstrapCall = findBootstrapApplicationCall(host, mainPath);
    componentName = bootstrapCall.arguments[0].getText();
    bootstrappingFilePath = mainPath;
    bootstrappingSource = getSourceFile(host, mainPath);
  } else {
    // NgModule Application
    const modulePath = getAppModulePath(host, mainPath);
    const moduleSource = getSourceFile(host, modulePath);
    const metadataNode = getDecoratorMetadata(moduleSource, 'NgModule', '@angular/core')[0];
    const bootstrapProperty = getMetadataProperty(metadataNode, 'bootstrap');
    const arrLiteral = bootstrapProperty.initializer as ts.ArrayLiteralExpression;
    componentName = arrLiteral.elements[0].getText();
    bootstrappingSource = moduleSource;
    bootstrappingFilePath = modulePath;
  }

  const componentRelativeFilePath = getSourceNodes(bootstrappingSource)
    .filter(ts.isImportDeclaration)
    .filter((imp) => {
      return findNode(imp, ts.SyntaxKind.Identifier, componentName);
    })
    .map((imp) => {
      const pathStringLiteral = imp.moduleSpecifier as ts.StringLiteral;

      return pathStringLiteral.text;
    })[0];

  return join(dirname(bootstrappingFilePath), componentRelativeFilePath + '.ts');
}
// end helper functions.

function validateProject(mainPath: string): Rule {
  return (host: Tree) => {
    const routerOutletCheckRegex = /<router-outlet.*?>([\s\S]*?)(?:<\/router-outlet>)?/;

    const componentPath = getBootstrapComponentPath(host, mainPath);
    const tmpl = getComponentTemplateInfo(host, componentPath);
    const template = getComponentTemplate(host, componentPath, tmpl);
    if (!routerOutletCheckRegex.test(template)) {
      throw new SchematicsException(
        `Prerequisite for application shell is to define a router-outlet in your root component.`,
      );
    }
  };
}

function getMetadataProperty(metadata: ts.Node, propertyName: string): ts.PropertyAssignment {
  const properties = (metadata as ts.ObjectLiteralExpression).properties;
  const property = properties.filter(ts.isPropertyAssignment).filter((prop) => {
    const name = prop.name;
    switch (name.kind) {
      case ts.SyntaxKind.Identifier:
        return name.getText() === propertyName;
      case ts.SyntaxKind.StringLiteral:
        return name.text === propertyName;
    }

    return false;
  })[0];

  return property;
}

function addServerRoutingConfig(options: AppShellOptions, isStandalone: boolean): Rule {
  return async (host: Tree) => {
    const workspace = await getWorkspace(host);
    const project = workspace.projects.get(options.project);
    if (!project) {
      throw new SchematicsException(`Project name "${options.project}" doesn't not exist.`);
    }

    const configFilePath = isStandalone
      ? join(project.sourceRoot ?? 'src', 'app/app.config.server.ts')
      : getServerModulePath(host, project.sourceRoot || 'src', 'main.server.ts');

    if (!configFilePath || !host.exists(configFilePath)) {
      throw new SchematicsException(`Cannot find "${configFilePath}".`);
    }

    let recorder = host.beginUpdate(configFilePath);
    const configSourceFile = getSourceFile(host, configFilePath);
    const functionCall = findNodes(
      configSourceFile,
      ts.isCallExpression,
      /** max */ undefined,
      /** recursive */ true,
    ).find(
      (n) => ts.isIdentifier(n.expression) && n.expression.getText() === 'provideServerRendering',
    );

    if (!functionCall) {
      throw new SchematicsException(
        `Cannot find the "provideServerRendering" function call in "${configFilePath}".`,
      );
    }

    recorder = host.beginUpdate(configFilePath);
    recorder.insertLeft(functionCall.end - 1, `, withAppShell(AppShell)`);

    applyToUpdateRecorder(recorder, [
      insertImport(configSourceFile, configFilePath, 'withAppShell', '@angular/ssr'),
      insertImport(configSourceFile, configFilePath, 'AppShell', './app-shell/app-shell'),
    ]);

    host.commitUpdate(recorder);
  };
}

export default createProjectSchematic<AppShellOptions>(async (options, { tree }) => {
  const browserEntryPoint = await getMainFilePath(tree, options.project);
  const isStandalone = isStandaloneApp(tree, browserEntryPoint);

  return chain([
    validateProject(browserEntryPoint),
    schematic('server', options),
    addServerRoutingConfig(options, isStandalone),
    schematic('component', {
      name: 'app-shell',
      module: 'app.module.server.ts',
      project: options.project,
      standalone: isStandalone,
    }),
  ]);
});
