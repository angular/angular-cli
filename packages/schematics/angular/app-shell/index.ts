/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonObject, dirname, join, normalize } from '@angular-devkit/core';
import {
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
  chain,
  schematic,
} from '@angular-devkit/schematics';
import * as ts from 'typescript';
import {
  WorkspaceProject,
  WorkspaceTool,
} from '../../../angular_devkit/core/src/workspace/workspace-schema';
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
import { InsertChange } from '../utility/change';
import { getWorkspace, getWorkspacePath } from '../utility/config';
import { getAppModulePath } from '../utility/ng-ast-utils';
import { Schema as AppShellOptions } from './schema';


// Helper functions. (possible refactors to utils)
function formatMissingAppMsg(label: string, nameOrIndex: string | undefined): string {
  const nameOrIndexText = nameOrIndex ? ` (${nameOrIndex})` : '';

  return `${label} app ${nameOrIndexText} not found.`;
}

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
  host: Tree, project: WorkspaceProject, architect: WorkspaceTool,
): string | null {
  const mainPath = architect.server.options.main;
  const mainSource = getSourceFile(host, mainPath);
  const allNodes = getSourceNodes(mainSource);
  const expNode = allNodes.filter(node => node.kind === ts.SyntaxKind.ExportDeclaration)[0];
  if (!expNode) {
    return null;
  }
  const relativePath = <ts.StringLiteral> (<ts.ExportDeclaration> expNode).moduleSpecifier;
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

function getBootstrapComponentPath(host: Tree, project: WorkspaceProject): string {
  if (!project.architect) {
    throw new Error('Project architect not found.');
  }
  const mainPath = project.architect.build.options.main;
  const modulePath = getAppModulePath(host, mainPath);
  const moduleSource = getSourceFile(host, modulePath);

  const metadataNode = getDecoratorMetadata(moduleSource, 'NgModule', '@angular/core')[0];
  const bootstrapProperty = getMetadataProperty(metadataNode, 'bootstrap');

  const arrLiteral = (<ts.PropertyAssignment> bootstrapProperty)
    .initializer as ts.ArrayLiteralExpression;

  const componentSymbol = arrLiteral.elements[0].getText();

  const relativePath = getSourceNodes(moduleSource)
    .filter(node => node.kind === ts.SyntaxKind.ImportDeclaration)
    .filter(imp => {
      return findNode(imp, ts.SyntaxKind.Identifier, componentSymbol);
    })
    .map((imp: ts.ImportDeclaration) => {
      const pathStringLiteral = <ts.StringLiteral> imp.moduleSpecifier;

      return pathStringLiteral.text;
    })[0];

  return join(dirname(normalize(modulePath)), relativePath + '.ts');
}
// end helper functions.

function validateProject(options: AppShellOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    const routerOutletCheckRegex = /<router\-outlet.*?>([\s\S]*?)<\/router\-outlet>/;

    const clientProject = getClientProject(host, options);
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
    const architect = getClientArchitect(host, options);
    if (architect !== null) {
      if (architect.server !== undefined) {
        return host;
      }
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
    const workspacePath = getWorkspacePath(host);

    const appShellTarget: JsonObject = {
      builder: '@angular-devkit/build-angular:app-shell',
      options: {
        browserTarget: `${options.clientProject}:build`,
        serverTarget: `${options.clientProject}:server`,
        route: options.route,
      },
    };

    if (!workspace.projects[options.clientProject]) {
      throw new SchematicsException(`Client app ${options.clientProject} not found.`);
    }
    const clientProject = workspace.projects[options.clientProject];
    if (!clientProject.architect) {
      throw new Error('Client project architect not found.');
    }
    clientProject.architect['app-shell'] = appShellTarget;

    host.overwrite(workspacePath, JSON.stringify(workspace, null, 2));

    return host;
  };
}

function addRouterModule(options: AppShellOptions): Rule {
  return (host: Tree) => {
    const clientArchitect = getClientArchitect(host, options);
    const mainPath = clientArchitect.build.options.main;
    const modulePath = getAppModulePath(host, mainPath);
    const moduleSource = getSourceFile(host, modulePath);
    const changes = addImportToModule(moduleSource, modulePath, 'RouterModule', '@angular/router');
    const recorder = host.beginUpdate(modulePath);
    changes.forEach((change: InsertChange) => {
      recorder.insertLeft(change.pos, change.toAdd);
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
    const clientProject = getClientProject(host, options);
    const architect = getClientArchitect(host, options);
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

function getClientProject(host: Tree, options: AppShellOptions): WorkspaceProject {
  const workspace = getWorkspace(host);
  const clientProject = workspace.projects[options.clientProject];
  if (!clientProject) {
    throw new SchematicsException(formatMissingAppMsg('Client', options.clientProject));
  }

  return clientProject;
}

function getClientArchitect(host: Tree, options: AppShellOptions): WorkspaceTool {
  const clientArchitect = getClientProject(host, options).architect;

  if (!clientArchitect) {
    throw new Error('Client project architect not found.');
  }

  return clientArchitect;
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
