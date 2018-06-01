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
  UpdateRecorder,
  apply,
  chain,
  mergeWith,
  move,
  template,
  url,
} from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import * as ts from 'typescript';
import { addSymbolToNgModuleMetadata, insertImport, isImported } from '../utility/ast-utils';
import { InsertChange } from '../utility/change';
import {
  getWorkspace,
  getWorkspacePath,
} from '../utility/config';
import { addPackageJsonDependency, getPackageJsonDependency } from '../utility/dependencies';
import { getAppModulePath } from '../utility/ng-ast-utils';
import { Schema as ServiceWorkerOptions } from './schema';

function updateConfigFile(options: ServiceWorkerOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    context.logger.debug('updating config file.');
    const workspacePath = getWorkspacePath(host);

    const workspace = getWorkspace(host);

    const project = workspace.projects[options.project as string];

    if (!project) {
      throw new Error(`Project is not defined in this workspace.`);
    }

    if (!project.architect) {
      throw new Error(`Architect is not defined for this project.`);
    }

    if (!project.architect[options.target]) {
      throw new Error(`Target is not defined for this project.`);
    }

    let applyTo = project.architect[options.target].options;

    if (options.configuration &&
        project.architect[options.target].configurations &&
        project.architect[options.target].configurations[options.configuration]) {
      applyTo = project.architect[options.target].configurations[options.configuration];
    }

    applyTo.serviceWorker = true;

    host.overwrite(workspacePath, JSON.stringify(workspace, null, 2));

    return host;
  };
}

function addDependencies(): Rule {
  return (host: Tree, context: SchematicContext) => {
    const packageName = '@angular/service-worker';
    context.logger.debug(`adding dependency (${packageName})`);
    const coreDep = getPackageJsonDependency(host, '@angular/core');
    if (coreDep === null) {
      throw new SchematicsException('Could not find version.');
    }
    const serviceWorkerDep = {
      ...coreDep,
      name: packageName,
    };
    addPackageJsonDependency(host, serviceWorkerDep);

    return host;
  };
}

function updateAppModule(options: ServiceWorkerOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    context.logger.debug('Updating appmodule');

    // find app module
    const workspace = getWorkspace(host);
    const project = workspace.projects[options.project as string];
    if (!project.architect) {
      throw new Error('Project architect not found.');
    }
    const mainPath = project.architect.build.options.main;
    const modulePath = getAppModulePath(host, mainPath);
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
      `ServiceWorkerModule.register('ngsw-worker.js', { enabled: environment.production })`;
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
    const workspace = getWorkspace(host);
    if (!options.project) {
      throw new SchematicsException('Option "project" is required.');
    }
    const project = workspace.projects[options.project];
    if (!project) {
      throw new SchematicsException(`Invalid project name (${options.project})`);
    }
    if (project.projectType !== 'application') {
      throw new SchematicsException(`Service worker requires a project type of "application".`);
    }

    const templateSource = apply(url('./files'), [
      template({...options}),
      move(project.root),
    ]);

    context.addTask(new NodePackageInstallTask());

    return chain([
      mergeWith(templateSource),
      updateConfigFile(options),
      addDependencies(),
      updateAppModule(options),
    ]);
  };
}
