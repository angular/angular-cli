/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { join, normalize, tags } from '@angular-devkit/core';
import {
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
  apply,
  applyTemplates,
  chain,
  mergeWith,
  move,
  url,
} from '@angular-devkit/schematics';
import * as ts from '../third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { addDependency, addRootProvider, readWorkspace, writeWorkspace } from '../utility';
import { addSymbolToNgModuleMetadata, insertImport } from '../utility/ast-utils';
import { applyToUpdateRecorder } from '../utility/change';
import { getPackageJsonDependency } from '../utility/dependencies';
import { getAppModulePath, isStandaloneApp } from '../utility/ng-ast-utils';
import { relativePathToWorkspaceRoot } from '../utility/paths';
import { targetBuildNotFoundError } from '../utility/project-targets';
import { findAppConfig } from '../utility/standalone/app_config';
import { findBootstrapApplicationCall } from '../utility/standalone/util';
import { Builders } from '../utility/workspace-models';
import { Schema as ServiceWorkerOptions } from './schema';

function addDependencies(): Rule {
  return (host: Tree) => {
    const coreDep = getPackageJsonDependency(host, '@angular/core');
    if (!coreDep) {
      throw new SchematicsException('Could not find "@angular/core" version.');
    }

    return addDependency('@angular/service-worker', coreDep.version);
  };
}

function updateAppModule(mainPath: string): Rule {
  return (host: Tree, context: SchematicContext) => {
    context.logger.debug('Updating appmodule');

    const modulePath = getAppModulePath(host, mainPath);
    context.logger.debug(`module path: ${modulePath}`);

    addImport(host, modulePath, 'ServiceWorkerModule', '@angular/service-worker');
    addImport(host, modulePath, 'isDevMode', '@angular/core');

    // register SW in application module
    const importText = tags.stripIndent`
      ServiceWorkerModule.register('ngsw-worker.js', {
        enabled: !isDevMode(),
        // Register the ServiceWorker as soon as the application is stable
        // or after 30 seconds (whichever comes first).
        registrationStrategy: 'registerWhenStable:30000'
      })
    `;
    const moduleSource = getTsSourceFile(host, modulePath);
    const metadataChanges = addSymbolToNgModuleMetadata(
      moduleSource,
      modulePath,
      'imports',
      importText,
    );
    if (metadataChanges) {
      const recorder = host.beginUpdate(modulePath);
      applyToUpdateRecorder(recorder, metadataChanges);
      host.commitUpdate(recorder);
    }

    return host;
  };
}

function addProvideServiceWorker(projectName: string, mainPath: string): Rule {
  return (host: Tree) => {
    const bootstrapCall = findBootstrapApplicationCall(host, mainPath);
    const appConfig = findAppConfig(bootstrapCall, host, mainPath)?.filePath || mainPath;
    addImport(host, appConfig, 'isDevMode', '@angular/core');

    return addRootProvider(
      projectName,
      ({ code, external }) =>
        code`${external('provideServiceWorker', '@angular/service-worker')}('ngsw-worker.js', {
            enabled: !isDevMode(),
            registrationStrategy: 'registerWhenStable:30000'
          })`,
    );
  };
}

function getTsSourceFile(host: Tree, path: string): ts.SourceFile {
  const content = host.readText(path);
  const source = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true);

  return source;
}

export default function (options: ServiceWorkerOptions): Rule {
  return async (host: Tree) => {
    const workspace = await readWorkspace(host);
    const project = workspace.projects.get(options.project);
    if (!project) {
      throw new SchematicsException(`Invalid project name (${options.project})`);
    }
    if (project.extensions.projectType !== 'application') {
      throw new SchematicsException(`Service worker requires a project type of "application".`);
    }
    const buildTarget = project.targets.get('build');
    if (!buildTarget) {
      throw targetBuildNotFoundError();
    }

    const buildOptions = buildTarget.options as Record<string, string | boolean>;
    let browserEntryPoint: string | undefined;
    const ngswConfigPath = join(normalize(project.root), 'ngsw-config.json');

    if (
      buildTarget.builder === Builders.Application ||
      buildTarget.builder === Builders.BuildApplication
    ) {
      browserEntryPoint = buildOptions.browser as string;
      const productionConf = buildTarget.configurations?.production;
      if (productionConf) {
        productionConf.serviceWorker = ngswConfigPath;
      }
    } else {
      browserEntryPoint = buildOptions.main as string;
      buildOptions.serviceWorker = true;
      buildOptions.ngswConfigPath = ngswConfigPath;
    }

    await writeWorkspace(host, workspace);

    return chain([
      addDependencies(),
      mergeWith(
        apply(url('./files'), [
          applyTemplates({
            ...options,
            relativePathToWorkspaceRoot: relativePathToWorkspaceRoot(project.root),
          }),
          move(project.root),
        ]),
      ),
      isStandaloneApp(host, browserEntryPoint)
        ? addProvideServiceWorker(options.project, browserEntryPoint)
        : updateAppModule(browserEntryPoint),
    ]);
  };
}

function addImport(host: Tree, filePath: string, symbolName: string, moduleName: string): void {
  const moduleSource = getTsSourceFile(host, filePath);
  const change = insertImport(moduleSource, filePath, symbolName, moduleName);

  if (change) {
    const recorder = host.beginUpdate(filePath);
    applyToUpdateRecorder(recorder, [change]);
    host.commitUpdate(recorder);
  }
}
