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
import { getWorkspace, updateWorkspace } from '../utility/config';
import { addPackageJsonDependency, getPackageJsonDependency } from '../utility/dependencies';
import { getAppModulePath } from '../utility/ng-ast-utils';
import { getProjectTargets, targetBuildNotFoundError } from '../utility/project-targets';
import { BrowserBuilderOptions, BrowserBuilderTarget } from '../utility/workspace-models';
import { Schema as ServiceWorkerOptions } from './schema';

function updateConfigFile(options: ServiceWorkerOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    context.logger.debug('updating config file.');
    const workspace = getWorkspace(host);

    const projectTargets = getProjectTargets(workspace, options.project);

    if (!projectTargets[options.target]) {
      throw new Error(`Target is not defined for this project.`);
    }

    const target = projectTargets[options.target] as BrowserBuilderTarget;
    let applyTo = target.options;

    if (options.configuration &&
      target.configurations &&
      target.configurations[options.configuration]) {
      applyTo = target.configurations[options.configuration] as BrowserBuilderOptions;
    }

    applyTo.serviceWorker = true;

    return updateWorkspace(workspace);
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
    const projectTargets = getProjectTargets(host, options.project);
    if (!projectTargets.build) {
      throw targetBuildNotFoundError();
    }

    const mainPath = projectTargets.build.options.main;
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
