/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { dirname, experimental, join, normalize } from '@angular-devkit/core';
import {
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
  chain,
  schematic,
} from '@angular-devkit/schematics';
import * as ts from 'typescript';
import { Schema as ComponentOptions } from '../component/schema';
import {
  addImportToModule,
  addSymbolToNgModuleMetadata,
  findNode,
  getDecoratorMetadata,
  getSourceNodes,
  insertImport,
  isImported,
} from '../utility/ast-utils';
import { Change, InsertChange } from '../utility/change';
import { getWorkspace, updateWorkspace } from '../utility/config';
import { getAppModulePath } from '../utility/ng-ast-utils';
import { getProject } from '../utility/project';
import { getProjectTargets, targetBuildNotFoundError } from '../utility/project-targets';
import { Builders, WorkspaceProject } from '../utility/workspace-models';
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

function getServerModulePath(
  host: Tree,
  project: experimental.workspace.WorkspaceProject,
  architect: experimental.workspace.WorkspaceTool,
): string | null {
  const mainPath = architect.server.options.main;
  const mainSource = getSourceFile(host, mainPath);
  const allNodes = getSourceNodes(mainSource);
  const expNode = allNodes.filter(node => node.kind === ts.SyntaxKind.ExportDeclaration)[0];
  if (!expNode) {
    return null;
  }
  const relativePath = (expNode as ts.ExportDeclaration).moduleSpecifier as ts.StringLiteral;
  const modulePath = normalize(`/${project.root}/src/${relativePath.text}.ts`);

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

function getBootstrapComponentPath(
  host: Tree,
  project: WorkspaceProject,
): string {
  const projectTargets = getProjectTargets(project);
  if (!projectTargets.build) {
    throw targetBuildNotFoundError();
  }

  const mainPath = projectTargets.build.options.main;
  const modulePath = getAppModulePath(host, mainPath);
  const moduleSource = getSourceFile(host, modulePath);

  const metadataNode = getDecoratorMetadata(moduleSource, 'NgModule', '@angular/core')[0];
  const bootstrapProperty = getMetadataProperty(metadataNode, 'bootstrap');

  const arrLiteral = (bootstrapProperty as ts.PropertyAssignment)
    .initializer as ts.ArrayLiteralExpression;

  const componentSymbol = arrLiteral.elements[0].getText();

  const relativePath = getSourceNodes(moduleSource)
    .filter(node => node.kind === ts.SyntaxKind.ImportDeclaration)
    .filter(imp => {
      return findNode(imp, ts.SyntaxKind.Identifier, componentSymbol);
    })
    .map((imp: ts.ImportDeclaration) => {
      const pathStringLiteral = imp.moduleSpecifier as ts.StringLiteral;

      return pathStringLiteral.text;
    })[0];

  return join(dirname(normalize(modulePath)), relativePath + '.ts');
}
// end helper functions.

function validateProject(options: AppShellOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    const routerOutletCheckRegex = /<router\-outlet.*?>([\s\S]*?)<\/router\-outlet>/;

    const clientProject = getProject(host, options.clientProject);
    if (clientProject.projectType !== 'application') {
      throw new SchematicsException(`App shell requires a project type of "application".`);
    }
    const componentPath = getBootstrapComponentPath(host, clientProject);
    const tmpl = getComponentTemplateInfo(host, componentPath);
    const template = getComponentTemplate(host, componentPath, tmpl);
    if (!routerOutletCheckRegex.test(template)) {
      const errorMsg =
        `Prerequisite for app shell is to define a router-outlet in your root component.`;
      context.logger.error(errorMsg);
      throw new SchematicsException(errorMsg);
    }
  };
}

function addUniversalTarget(options: AppShellOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    const architect = getProjectTargets(host, options.clientProject);
    if (architect.server) {
      return host;
    }

    // Copy options.
    const universalOptions = {
      ...options,
    };

    // Delete non-universal options.
    delete universalOptions.universalProject;
    delete universalOptions.route;
    delete universalOptions.name;
    delete universalOptions.outDir;
    delete universalOptions.root;
    delete universalOptions.index;
    delete universalOptions.sourceDir;

    return schematic('universal', universalOptions);
  };
}

function addAppShellConfigToWorkspace(options: AppShellOptions): Rule {
  return (host: Tree) => {
    if (!options.route) {
      throw new SchematicsException(`Route is not defined`);
    }

    const workspace = getWorkspace(host);
    const projectTargets = getProjectTargets(workspace, options.clientProject);
    projectTargets['app-shell'] = {
      builder: Builders.AppShell,
      options: {
        browserTarget: `${options.clientProject}:build`,
        serverTarget: `${options.clientProject}:server`,
        route: options.route,
      },
      configurations: {
        production: {
          browserTarget: `${options.clientProject}:build:production`,
          serverTarget: `${options.clientProject}:server:production`,
        },
      },
    };

    return updateWorkspace(workspace);
  };
}

function addRouterModule(options: AppShellOptions): Rule {
  return (host: Tree) => {
    const projectTargets = getProjectTargets(host, options.clientProject);
    if (!projectTargets.build) {
      throw targetBuildNotFoundError();
    }
    const mainPath = projectTargets.build.options.main;
    const modulePath = getAppModulePath(host, mainPath);
    const moduleSource = getSourceFile(host, modulePath);
    const changes = addImportToModule(moduleSource, modulePath, 'RouterModule', '@angular/router');
    const recorder = host.beginUpdate(modulePath);
    changes.forEach((change: Change) => {
      if (change instanceof InsertChange) {
        recorder.insertLeft(change.pos, change.toAdd);
      }
    });
    host.commitUpdate(recorder);

    return host;
  };
}

function getMetadataProperty(metadata: ts.Node, propertyName: string): ts.PropertyAssignment {
  const properties = (metadata as ts.ObjectLiteralExpression).properties;
  const property = properties
    .filter(prop => prop.kind === ts.SyntaxKind.PropertyAssignment)
    .filter((prop: ts.PropertyAssignment) => {
      const name = prop.name;
      switch (name.kind) {
        case ts.SyntaxKind.Identifier:
          return (name as ts.Identifier).getText() === propertyName;
        case ts.SyntaxKind.StringLiteral:
          return (name as ts.StringLiteral).text === propertyName;
      }

      return false;
    })[0];

  return property as ts.PropertyAssignment;
}

function addServerRoutes(options: AppShellOptions): Rule {
  return (host: Tree) => {
    const clientProject = getProject(host, options.clientProject);
    const architect = getProjectTargets(clientProject);
    // const mainPath = universalArchitect.build.options.main;
    const modulePath = getServerModulePath(host, clientProject, architect);
    if (modulePath === null) {
      throw new SchematicsException('Universal/server module not found.');
    }

    let moduleSource = getSourceFile(host, modulePath);
    if (!isImported(moduleSource, 'Routes', '@angular/router')) {
      const recorder = host.beginUpdate(modulePath);
      const routesChange = insertImport(moduleSource,
                                        modulePath,
                                        'Routes',
                                        '@angular/router') as InsertChange;
      if (routesChange.toAdd) {
        recorder.insertLeft(routesChange.pos, routesChange.toAdd);
      }

      const imports = getSourceNodes(moduleSource)
        .filter(node => node.kind === ts.SyntaxKind.ImportDeclaration)
        .sort((a, b) => a.getStart() - b.getStart());
      const insertPosition = imports[imports.length - 1].getEnd();
      const routeText =
        `\n\nconst routes: Routes = [ { path: '${options.route}', component: AppShellComponent }];`;
      recorder.insertRight(insertPosition, routeText);
      host.commitUpdate(recorder);
    }

    moduleSource = getSourceFile(host, modulePath);
    if (!isImported(moduleSource, 'RouterModule', '@angular/router')) {
      const recorder = host.beginUpdate(modulePath);
      const routerModuleChange = insertImport(moduleSource,
                                              modulePath,
                                              'RouterModule',
                                              '@angular/router') as InsertChange;

      if (routerModuleChange.toAdd) {
        recorder.insertLeft(routerModuleChange.pos, routerModuleChange.toAdd);
      }

      const metadataChange = addSymbolToNgModuleMetadata(
          moduleSource, modulePath, 'imports', 'RouterModule.forRoot(routes)');
      if (metadataChange) {
        metadataChange.forEach((change: InsertChange) => {
          recorder.insertRight(change.pos, change.toAdd);
        });
      }
      host.commitUpdate(recorder);
    }


    return host;
  };
}

function addShellComponent(options: AppShellOptions): Rule {
  const componentOptions: ComponentOptions = {
    name: 'app-shell',
    module: options.rootModuleFileName,
    project: options.clientProject,
  };

  return schematic('component', componentOptions);
}

export default function (options: AppShellOptions): Rule {
  return chain([
    validateProject(options),
    addUniversalTarget(options),
    addAppShellConfigToWorkspace(options),
    addRouterModule(options),
    addServerRoutes(options),
    addShellComponent(options),
  ]);
}
