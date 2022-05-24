/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { basename, normalize, split } from '@angular-devkit/core';
import { ProjectDefinition, TargetDefinition } from '@angular-devkit/core/src/workspace';
import {
  Rule,
  SchematicsException,
  Tree,
  apply,
  applyTemplates,
  chain,
  mergeWith,
  move,
  noop,
  url,
} from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import {
  DependencyType,
  addDependency,
  readWorkspace,
  updateWorkspace,
} from '@schematics/angular/utility';
import {
  addImportToModule,
  findNode,
  getDecoratorMetadata,
} from '@schematics/angular/utility/ast-utils';
import { InsertChange, applyToUpdateRecorder } from '@schematics/angular/utility/change';
import { findBootstrapModulePath } from '@schematics/angular/utility/ng-ast-utils';
import { posix } from 'path';
import * as ts from 'typescript';

import { Schema as NgAddOptions } from './schema';

export default function (options: NgAddOptions): Rule {
  return async (host, context) => {
    const workspace = await readWorkspace(host);
    const project = workspace.projects.get(options.project);

    if (project.extensions.projectType !== 'application') {
      throw new SchematicsException(`Universal requires a project type of "application".`);
    }

    const clientBuildTarget = project.targets.get('build');
    if (!clientBuildTarget) {
      throw new SchematicsException(`Project target "build" not found.`);
    }

    if (!options.skipInstall) {
      context.addTask(new NodePackageInstallTask());
    }

    return chain([
      augmentAppModuleRule(project, clientBuildTarget, options),
      options.ssr ? addSSRRule(project, clientBuildTarget) : noop(),
      options.prerender
        ? addDependency('@nguniversal/builders', '~0.0.0-PLACEHOLDER', {
            type: DependencyType.Dev,
          })
        : noop(),
      addScriptsRule(options),
      updateWorkspaceRule(options),
    ]);
  };
}

function addSSRRule(project: ProjectDefinition, buildTarget: TargetDefinition): Rule {
  return async () => {
    const templateSource = apply(url('./files/src'), [
      applyTemplates({}),
      move(project.sourceRoot ?? '/src'),
    ]);
    const rootSource = apply(url('./files/root'), [
      applyTemplates({
        tsConfigExtends: basename(normalize((buildTarget.options as any).tsConfig)),
        relativePathToWorkspaceRoot: relativePathToWorkspaceRoot(project.root),
      }),
      move(project.root),
    ]);

    return chain([
      addDependency('express', 'EXPRESS_VERSION', {
        type: DependencyType.Default,
      }),

      addDependency('@types/express', 'EXPRESS_TYPES_VERSION', {
        type: DependencyType.Dev,
      }),
      mergeWith(templateSource),
      mergeWith(rootSource),
    ]);
  };
}

function addScriptsRule(options: NgAddOptions): Rule {
  return async (host) => {
    const pkgPath = '/package.json';
    const buffer = host.read(pkgPath);
    if (!buffer) {
      throw new SchematicsException('Could not find package.json');
    }

    const pkg = JSON.parse(buffer.toString()) as any;
    if (options.prerender) {
      pkg.scripts = {
        ...pkg.scripts,
        'prerender': `ng run ${options.project}:prerender`,
      };
    }

    if (options.ssr) {
      pkg.scripts = {
        ...pkg.scripts,
        'build:client-and-server': `ng build ${options.project} && ng run ${options.project}:server`,
        'build:server': `ng run ${options.project}:server`,
        'serve:ssr': `node dist/${options.project}/server/main.js`,
      };
    }

    host.overwrite(pkgPath, JSON.stringify(pkg, null, 2));
  };
}

function updateWorkspaceRule(options: NgAddOptions): Rule {
  return updateWorkspace((workspace) => {
    const project = workspace.projects.get(options.project);
    if (options.ssr) {
      project.targets.add({
        name: 'server',
        builder: '@angular-devkit/build-angular:server',
        options: {
          outputPath: `dist/${options.project}/server`,
          main: posix.join(project.sourceRoot ?? '', 'server.ts'),
          tsConfig: posix.join(project.root, 'tsconfig.server.json'),
          bundleDependencies: false,
          optimization: false,
        },
      });

      const buildTarget = project.targets.get('build');
      if (project.targets.get('build')?.options) {
        buildTarget.options.outputPath = `dist/${options.project}/browser`;
      }
    }

    if (options.prerender) {
      project.targets.add({
        name: 'prerender',
        builder: '@nguniversal/builders:static-generator',
        defaultConfiguration: 'production',
        options: {},
        configurations: {
          production: {
            browserTarget: `${options.project}:build:production`,
          },
          development: {
            browserTarget: `${options.project}:build:development`,
          },
        },
      });
    }
  });
}

function augmentAppModuleRule(
  project: ProjectDefinition,
  buildTarget: TargetDefinition,
  options: NgAddOptions,
): Rule {
  return (host: Tree) => {
    const bootstrapModuleRelativePath = findBootstrapModulePath(
      host,
      buildTarget.options.main as string,
    );
    const bootstrapModulePath = normalize(
      `/${project.sourceRoot}/${bootstrapModuleRelativePath}.ts`,
    );

    // Add BrowserModule.withServerTransition()
    const browserModuleImport = findBrowserModuleImport(host, bootstrapModulePath);
    const transitionCall = `.withServerTransition({ appId: '${options.appId}' })`;
    const position = browserModuleImport.pos + browserModuleImport.getFullText().length;
    const transitionCallChange = new InsertChange(bootstrapModulePath, position, transitionCall);

    const transitionCallRecorder = host.beginUpdate(bootstrapModulePath);
    transitionCallRecorder.insertLeft(transitionCallChange.pos, transitionCallChange.toAdd);
    host.commitUpdate(transitionCallRecorder);

    // Add @nguniversal/common/clover
    let changes = addImportToModule(
      getSourceFile(host, bootstrapModulePath),
      bootstrapModulePath,
      'RendererModule.forRoot()',
      '@nguniversal/common/clover',
    );
    let recorder = host.beginUpdate(bootstrapModulePath);
    applyToUpdateRecorder(recorder, changes);
    host.commitUpdate(recorder);

    changes = addImportToModule(
      getSourceFile(host, bootstrapModulePath),
      bootstrapModulePath,
      'TransferHttpCacheModule',
      '@nguniversal/common/clover',
    );
    recorder = host.beginUpdate(bootstrapModulePath);
    applyToUpdateRecorder(recorder, changes);
    host.commitUpdate(recorder);
  };
}

function relativePathToWorkspaceRoot(projectRoot: string | undefined): string {
  const normalizedPath = split(normalize(projectRoot || ''));

  if (normalizedPath.length === 0 || !normalizedPath[0]) {
    return '.';
  } else {
    return normalizedPath.map(() => '..').join('/');
  }
}

function findBrowserModuleImport(host: Tree, modulePath: string): ts.Node {
  const source = getSourceFile(host, modulePath);
  const decoratorMetadata = getDecoratorMetadata(source, 'NgModule', '@angular/core')[0];
  const browserModuleNode = findNode(decoratorMetadata, ts.SyntaxKind.Identifier, 'BrowserModule');

  if (!browserModuleNode) {
    throw new SchematicsException(`Cannot find BrowserModule import in ${modulePath}`);
  }

  return browserModuleNode;
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
