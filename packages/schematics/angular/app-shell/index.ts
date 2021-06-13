/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { dirname, join, normalize } from '@angular-devkit/core';
import {
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
  chain,
  noop,
  schematic,
} from '@angular-devkit/schematics';
import { Schema as ComponentOptions } from '../component/schema';
import * as ts from '../third_party/github.com/Microsoft/TypeScript/lib/typescript';
import {
  addImportToModule,
  addSymbolToNgModuleMetadata,
  findNode,
  getDecoratorMetadata,
  getSourceNodes,
  insertImport,
  isImported,
} from '../utility/ast-utils';
import { applyToUpdateRecorder } from '../utility/change';
import { getAppModulePath } from '../utility/ng-ast-utils';
import { targetBuildNotFoundError } from '../utility/project-targets';
import { getWorkspace, updateWorkspace } from '../utility/workspace';
import { BrowserBuilderOptions, Builders, ServerBuilderOptions } from '../utility/workspace-models';
import { Schema as AppShellOptions } from './schema';

function getSourceFile(host: Tree, path: string): ts.SourceFile {
  const buffer = host.read(path);
  if (!buffer) {
    throw new SchematicsException(`Could not find ${path}.`);
  }
  const content = buffer.toString();
  const source = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true);

  return source;
}

function getServerModulePath(host: Tree, sourceRoot: string, mainPath: string): string | null {
  const mainSource = getSourceFile(host, join(normalize(sourceRoot), mainPath));
  const allNodes = getSourceNodes(mainSource);
  const expNode = allNodes.find((node) => ts.isExportDeclaration(node));
  if (!expNode) {
    return null;
  }
  const relativePath = (expNode as ts.ExportDeclaration).moduleSpecifier as ts.StringLiteral;
  const modulePath = normalize(`/${sourceRoot}/${relativePath.text}.ts`);

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
    const dir = dirname(normalize(compPath));
    const templatePath = join(dir, templateUrl);
    const buffer = host.read(templatePath);
    if (buffer) {
      template = buffer.toString();
    }
  }

  return template;
}

function getBootstrapComponentPath(host: Tree, mainPath: string): string {
  const modulePath = getAppModulePath(host, mainPath);
  const moduleSource = getSourceFile(host, modulePath);

  const metadataNode = getDecoratorMetadata(moduleSource, 'NgModule', '@angular/core')[0];
  const bootstrapProperty = getMetadataProperty(metadataNode, 'bootstrap');

  const arrLiteral = bootstrapProperty.initializer as ts.ArrayLiteralExpression;

  const componentSymbol = arrLiteral.elements[0].getText();

  const relativePath = getSourceNodes(moduleSource)
    .filter(ts.isImportDeclaration)
    .filter((imp) => {
      return findNode(imp, ts.SyntaxKind.Identifier, componentSymbol);
    })
    .map((imp) => {
      const pathStringLiteral = imp.moduleSpecifier as ts.StringLiteral;

      return pathStringLiteral.text;
    })[0];

  return join(dirname(normalize(modulePath)), relativePath + '.ts');
}
// end helper functions.

function validateProject(mainPath: string): Rule {
  return (host: Tree, context: SchematicContext) => {
    const routerOutletCheckRegex = /<router\-outlet.*?>([\s\S]*?)<\/router\-outlet>/;

    const componentPath = getBootstrapComponentPath(host, mainPath);
    const tmpl = getComponentTemplateInfo(host, componentPath);
    const template = getComponentTemplate(host, componentPath, tmpl);
    if (!routerOutletCheckRegex.test(template)) {
      const errorMsg = `Prerequisite for app shell is to define a router-outlet in your root component.`;
      context.logger.error(errorMsg);
      throw new SchematicsException(errorMsg);
    }
  };
}

function addUniversalTarget(options: AppShellOptions): Rule {
  return () => {
    // Copy options.
    const universalOptions = {
      ...options,
    };

    // Delete non-universal options.
    delete universalOptions.route;

    return schematic('universal', universalOptions);
  };
}

function addAppShellConfigToWorkspace(options: AppShellOptions): Rule {
  return (host, context) => {
    if (!options.route) {
      throw new SchematicsException(`Route is not defined`);
    }

    return updateWorkspace((workspace) => {
      const project = workspace.projects.get(options.project);
      if (!project) {
        return;
      }

      // Validation of targets is handled already in the main function.
      // Duplicate keys means that we have configurations in both server and build builders.
      const serverConfigKeys = project.targets.get('server')?.configurations ?? {};
      const buildConfigKeys = project.targets.get('build')?.configurations ?? {};

      const configurationNames = Object.keys({
        ...serverConfigKeys,
        ...buildConfigKeys,
      });

      const configurations: Record<string, {}> = {};
      for (const key of configurationNames) {
        if (!serverConfigKeys[key]) {
          context.logger.warn(
            `Skipped adding "${key}" configuration to "app-shell" target as it's missing from "server" target.`,
          );

          continue;
        }

        if (!buildConfigKeys[key]) {
          context.logger.warn(
            `Skipped adding "${key}" configuration to "app-shell" target as it's missing from "build" target.`,
          );

          continue;
        }

        configurations[key] = {
          browserTarget: `${options.project}:build:${key}`,
          serverTarget: `${options.project}:server:${key}`,
        };
      }

      project.targets.add({
        name: 'app-shell',
        builder: Builders.AppShell,
        defaultConfiguration: configurations['production'] ? 'production' : undefined,
        options: {
          route: options.route,
        },
        configurations,
      });
    });
  };
}

function addRouterModule(mainPath: string): Rule {
  return (host: Tree) => {
    const modulePath = getAppModulePath(host, mainPath);
    const moduleSource = getSourceFile(host, modulePath);
    const changes = addImportToModule(moduleSource, modulePath, 'RouterModule', '@angular/router');
    const recorder = host.beginUpdate(modulePath);
    applyToUpdateRecorder(recorder, changes);
    host.commitUpdate(recorder);

    return host;
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

function addServerRoutes(options: AppShellOptions): Rule {
  return async (host: Tree) => {
    // The workspace gets updated so this needs to be reloaded
    const workspace = await getWorkspace(host);
    const clientProject = workspace.projects.get(options.project);
    if (!clientProject) {
      throw new Error('Universal schematic removed client project.');
    }
    const clientServerTarget = clientProject.targets.get('server');
    if (!clientServerTarget) {
      throw new Error('Universal schematic did not add server target to client project.');
    }
    const clientServerOptions = (clientServerTarget.options as unknown) as ServerBuilderOptions;
    if (!clientServerOptions) {
      throw new SchematicsException('Server target does not contain options.');
    }
    const modulePath = getServerModulePath(
      host,
      clientProject.sourceRoot || 'src',
      options.main as string,
    );
    if (modulePath === null) {
      throw new SchematicsException('Universal/server module not found.');
    }

    let moduleSource = getSourceFile(host, modulePath);
    if (!isImported(moduleSource, 'Routes', '@angular/router')) {
      const recorder = host.beginUpdate(modulePath);
      const routesChange = insertImport(moduleSource, modulePath, 'Routes', '@angular/router');
      if (routesChange) {
        applyToUpdateRecorder(recorder, [routesChange]);
      }

      const imports = getSourceNodes(moduleSource)
        .filter((node) => node.kind === ts.SyntaxKind.ImportDeclaration)
        .sort((a, b) => a.getStart() - b.getStart());
      const insertPosition = imports[imports.length - 1].getEnd();
      const routeText = `\n\nconst routes: Routes = [ { path: '${options.route}', component: AppShellComponent }];`;
      recorder.insertRight(insertPosition, routeText);
      host.commitUpdate(recorder);
    }

    moduleSource = getSourceFile(host, modulePath);
    if (!isImported(moduleSource, 'RouterModule', '@angular/router')) {
      const recorder = host.beginUpdate(modulePath);
      const routerModuleChange = insertImport(
        moduleSource,
        modulePath,
        'RouterModule',
        '@angular/router',
      );

      if (routerModuleChange) {
        applyToUpdateRecorder(recorder, [routerModuleChange]);
      }

      const metadataChange = addSymbolToNgModuleMetadata(
        moduleSource,
        modulePath,
        'imports',
        'RouterModule.forRoot(routes)',
      );
      if (metadataChange) {
        applyToUpdateRecorder(recorder, metadataChange);
      }
      host.commitUpdate(recorder);
    }
  };
}

function addShellComponent(options: AppShellOptions): Rule {
  const componentOptions: ComponentOptions = {
    name: 'app-shell',
    module: options.rootModuleFileName,
    project: options.project,
  };

  return schematic('component', componentOptions);
}

export default function (options: AppShellOptions): Rule {
  return async (tree) => {
    const workspace = await getWorkspace(tree);
    const clientProject = workspace.projects.get(options.project);
    if (!clientProject || clientProject.extensions.projectType !== 'application') {
      throw new SchematicsException(`A client project type of "application" is required.`);
    }
    const clientBuildTarget = clientProject.targets.get('build');
    if (!clientBuildTarget) {
      throw targetBuildNotFoundError();
    }
    const clientBuildOptions = ((clientBuildTarget.options ||
      {}) as unknown) as BrowserBuilderOptions;

    return chain([
      validateProject(clientBuildOptions.main),
      clientProject.targets.has('server') ? noop() : addUniversalTarget(options),
      addAppShellConfigToWorkspace(options),
      addRouterModule(clientBuildOptions.main),
      addServerRoutes(options),
      addShellComponent(options),
    ]);
  };
}
