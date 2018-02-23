/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
  chain,
} from '@angular-devkit/schematics';
import * as ts from 'typescript';
import { addSymbolToNgModuleMetadata, isImported } from '../utility/ast-utils';
import { InsertChange } from '../utility/change';
import { AppConfig, CliConfig, getAppFromConfig, getConfig } from '../utility/config';
import { getAppModulePath } from '../utility/ng-ast-utils';
import { insertImport } from '../utility/route-utils';
import { Schema as ServiceWorkerOptions } from './schema';

const configFilePath = '/.angular-cli.json';
const packageJsonPath = '/package.json';

function getAppConfig(config: CliConfig, nameOrIndex: string): AppConfig {
  const appConfig = getAppFromConfig(config, nameOrIndex);
  if (!appConfig) {
    throw new SchematicsException(`App (${nameOrIndex}) not found.`);
  }

  return appConfig;
}

function updateConfigFile(options: ServiceWorkerOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    context.logger.debug(`updating config file (${configFilePath})`);
    const config = getConfig(host);
    const appConfig = getAppConfig(config, options.app || '0');
    appConfig.serviceWorker = true;
    host.overwrite(configFilePath, JSON.stringify(config, null, 2));

    return host;
  };
}

function addDependencies(): Rule {
  return (host: Tree, context: SchematicContext) => {
    const packageName = '@angular/platform-server';
    context.logger.debug(`adding dependency (${packageName})`);
    const buffer = host.read(packageJsonPath);
    if (buffer === null) {
      throw new SchematicsException('Could not find package.json');
    }

    const packageObject = JSON.parse(buffer.toString());

    const ngCoreVersion = packageObject.dependencies['@angular/core'];
    packageObject.dependencies[packageName] = ngCoreVersion;

    host.overwrite(packageJsonPath, JSON.stringify(packageObject, null, 2));

    return host;
  };
}

function updateAppModule(options: ServiceWorkerOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    context.logger.debug('Updating appmodule');

    // find app module
    const appConfig = getAppConfig(getConfig(host), options.app || '0');
    const modulePath = getAppModulePath(host, appConfig);
    context.logger.debug(`module path: ${modulePath}`);

    // add import
    let moduleSource = getTsSourceFile(host, modulePath);
    let importModule = 'ServiceWorkerModule';
    let importPath = '@angular/service-worker';
    if (!isImported(moduleSource, importModule, importPath)) {
      const change = insertImport
      (moduleSource, modulePath, importModule, importPath);
      if (change) {
        const recorder = host.beginUpdate(modulePath);
        recorder.insertLeft((change as InsertChange).pos, (change as InsertChange).toAdd);
        host.commitUpdate(recorder);
      }
    }

    // add import for environments
    // import { environment } from '../environments/environment';
    moduleSource = getTsSourceFile(host, modulePath);
    importModule = 'environment';
    // TODO: dynamically find environments relative path
    importPath = '../environments/environment';
    if (!isImported(moduleSource, importModule, importPath)) {
      const change = insertImport
      (moduleSource, modulePath, importModule, importPath);
      if (change) {
        const recorder = host.beginUpdate(modulePath);
        recorder.insertLeft((change as InsertChange).pos, (change as InsertChange).toAdd);
        host.commitUpdate(recorder);
      }
    }

    // register SW in app module
    const importText =
      `ServiceWorkerModule.register('/ngsw-worker.js', { enabled: environment.production })`;
    moduleSource = getTsSourceFile(host, modulePath);
    const metadataChanges = addSymbolToNgModuleMetadata(
      moduleSource, modulePath, 'imports', importText);
    if (metadataChanges) {
      const recorder = host.beginUpdate(modulePath);
      metadataChanges.forEach((change: InsertChange) => {
        recorder.insertRight(change.pos, change.toAdd);
      });
      host.commitUpdate(recorder);
    }

    return host;
  };
}

function getTsSourceFile(host: Tree, path: string): ts.SourceFile {
  const buffer = host.read(path);
  if (!buffer) {
    throw new SchematicsException(`Could not read file (${path}).`);
  }
  const content = buffer.toString();
  const source = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true);

  return source;
}

export default function (options: ServiceWorkerOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    return chain([
      updateConfigFile(options),
      addDependencies(),
      updateAppModule(options),
    ])(host, context);
  };
}
