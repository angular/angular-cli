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
// end helper functions.

function addUniversalApp(options: AppShellOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
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
      throw new SchematicsException(`Client app (${options.clientApp}) could not be found.`);
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
      throw new SchematicsException('Client app not found.');
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

function addRouterOutlet(options: AppShellOptions): Rule {
  return (host: Tree) => {
    const routerOutletMarkup = `<router-outlet></router-outlet>`;

    const config = getConfig(host);
    const app = getAppFromConfig(config, options.clientApp || '0');
    if (app === null) {
      throw new SchematicsException('Client app not found.');
    }
    const modulePath = getAppModulePath(host, app);
    // const modulePath = getAppModulePath(host, options);
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

    const compSource = getSourceFile(host, compPath);
    const compMetadata = getDecoratorMetadata(compSource, 'Component', '@angular/core')[0];
    const templateProp = getMetadataProperty(compMetadata, 'template');
    const templateUrlProp = getMetadataProperty(compMetadata, 'templateUrl');

    if (templateProp) {
      if (!/<router\-outlet>/.test(templateProp.initializer.getText())) {
        const recorder = host.beginUpdate(compPath);
        recorder.insertRight(templateProp.initializer.getEnd() - 1, routerOutletMarkup);
        host.commitUpdate(recorder);
      }
    } else {
      const templateUrl = (templateUrlProp.initializer as ts.StringLiteral).text;
      const dirEntry = host.getDir(compPath);
      const dir = dirEntry.parent ? dirEntry.parent.path : '/';
      const templatePath = normalize(`/${dir}/${templateUrl}`);
      const buffer = host.read(templatePath);
      if (buffer) {
        const content = buffer.toString();
        if (!/<router\-outlet>/.test(content)) {
          const recorder = host.beginUpdate(templatePath);
          recorder.insertRight(buffer.length, routerOutletMarkup);
          host.commitUpdate(recorder);
        }
      }
    }

    return host;
  };
}

function addServerRoutes(options: AppShellOptions): Rule {
  return (host: Tree) => {
    const config = getConfig(host);
    const app = getAppFromConfig(config, options.universalApp);
    if (app === null) {
      throw new SchematicsException('Universal/server app not found.');
    }
    const modulePath = getServerModulePath(host, app);
    if (modulePath === null) {
      throw new SchematicsException('Universal/server app not found.');
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
    addUniversalApp(options),
    addAppShellConfig(options),
    addRouterModule(options),
    addRouterOutlet(options),
    addServerRoutes(options),
    addShellComponent(options),
  ]);
}
