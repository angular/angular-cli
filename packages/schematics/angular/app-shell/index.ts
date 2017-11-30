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
  chain,
  schematic,
} from '@angular-devkit/schematics';
import 'rxjs/add/operator/merge';
import * as ts from 'typescript';
import {
  addImportToModule,
  addSymbolToNgModuleMetadata,
  findNode,
  getDecoratorMetadata,
  getSourceNodes,
  isImported,
} from '../utility/ast-utils';
import { InsertChange } from '../utility/change';
import { AppConfig, getAppFromConfig, getConfig } from '../utility/config';
import { getAppModulePath } from '../utility/ng-ast-utils';
import { insertImport } from '../utility/route-utils';
import { Schema as AppShellOptions } from './schema';


// Helper functions. (possible refactors to utils)
function formatMissingAppMsg(label: string, nameOrIndex: string | undefined): string {
  const nameOrIndexText = nameOrIndex ? ` (${nameOrIndex})` : '';

  return `${label} app ${nameOrIndexText} not found.`;
}

function getSourceFile(host: Tree, path: string): ts.SourceFile {
  const buffer = host.read(path);
  if (!buffer) {
    throw new SchematicsException(`Could not find bootstrapped module.`);
  }
  const content = buffer.toString();
  const source = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true);

  return source;
}

function getServerModulePath(host: Tree, app: AppConfig): string | null {
  const mainPath = `/${app.root}/${app.main}`;
  const mainSource = getSourceFile(host, mainPath);
  const allNodes = getSourceNodes(mainSource);
  const expNode = allNodes.filter(node => node.kind === ts.SyntaxKind.ExportDeclaration)[0];
  if (!expNode) {
    return null;
  }
  const relativePath = <ts.StringLiteral> (<ts.ExportDeclaration> expNode).moduleSpecifier;
  const modulePath = normalize(`/${app.root}/${relativePath.text}.ts`);

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
    const dirEntry = host.getDir(compPath);
    const dir = dirEntry.parent ? dirEntry.parent.path : '/';
    const templatePath = normalize(`/${dir}/${templateUrl}`);
    const buffer = host.read(templatePath);
    if (buffer) {
      template = buffer.toString();
    }
  }

  return template;
}

function getBootstrapComponentPath(host: Tree, appConfig: AppConfig): string {
  const modulePath = getAppModulePath(host, appConfig);
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

  const dirEntry = host.getDir(modulePath);
  const dir = dirEntry.parent ? dirEntry.parent.path : '/';
  const compPath = normalize(`/${dir}/${relativePath}.ts`);

  return compPath;
}
// end helper functions.

function validateProject(options: AppShellOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    const routerOutletCheckRegex = /<router\-outlet.*?>([\s\S]*?)<\/router\-outlet>/;

    const config = getConfig(host);
    const app = getAppFromConfig(config, options.clientApp || '0');
    if (app === null) {
      throw new SchematicsException(formatMissingAppMsg('Client', options.clientApp));
    }

    const componentPath = getBootstrapComponentPath(host, app);
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

function addUniversalApp(options: AppShellOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    const config = getConfig(host);
    const appConfig = getAppFromConfig(config, options.universalApp);

    if (appConfig && appConfig.platform === 'server') {
      return host;
    } else if (appConfig && appConfig.platform !== 'server') {
      throw new SchematicsException(
        `Invalid platform for universal app (${options.universalApp}), value must be "server".`);
    }

    // Copy options.
    const universalOptions = {
      ...options,
      name: options.universalApp,
    };

    // Delete non-universal options.
    delete universalOptions.universalApp;
    delete universalOptions.route;

    return schematic('universal', universalOptions)(host, context);
  };
}

function addAppShellConfig(options: AppShellOptions): Rule {
  return (host: Tree) => {
    const config = getConfig(host);
    const app = getAppFromConfig(config, options.clientApp || '0');

    if (!app) {
      throw new SchematicsException(formatMissingAppMsg('Client', options.clientApp));
    }

    if (!options.route) {
      throw new SchematicsException(`Route is not defined`);
    }

    app.appShell = {
      app: options.universalApp,
      route: options.route,
    };

    host.overwrite('/.angular-cli.json', JSON.stringify(config, null, 2));

    return host;
  };
}

function addRouterModule(options: AppShellOptions): Rule {
  return (host: Tree) => {
    const config = getConfig(host);
    const app = getAppFromConfig(config, options.clientApp || '0');
    if (app === null) {
      throw new SchematicsException(formatMissingAppMsg('Client', options.clientApp));
    }
    const modulePath = getAppModulePath(host, app);
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
    const config = getConfig(host);
    const app = getAppFromConfig(config, options.universalApp);
    if (app === null) {
      throw new SchematicsException(formatMissingAppMsg('Universal/server', options.universalApp));
    }
    const modulePath = getServerModulePath(host, app);
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
  return (host: Tree, context: SchematicContext) => {

    const componentOptions = {
      name: 'app-shell',
      module: options.rootModuleFileName,
    };

    return schematic('component', componentOptions)(host, context);
  };
}

export default function (options: AppShellOptions): Rule {
  return chain([
    validateProject(options),
    addUniversalApp(options),
    addAppShellConfig(options),
    addRouterModule(options),
    addServerRoutes(options),
    addShellComponent(options),
  ]);
}
