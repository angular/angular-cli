/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Workspace, WorkspaceTarget } from '@angular-devkit/architect';
import { getSystemPath, join, normalize, relative } from '@angular-devkit/core';
import {
  BrowserBuilderOptions,
  DevServerBuilderOptions,
  ExtractI18nBuilderOptions,
  KarmaBuilderOptions,
  ProtractorBuilderOptions,
  TslintBuilderOptions,
} from '../../src';


const devkitRoot = normalize((global as any)._DevKitRoot); // tslint:disable-line:no-any
export const workspaceRoot = join(devkitRoot,
  'tests/@angular_devkit/build_webpack/hello-world-app/');
const builderPath = join(devkitRoot, 'packages/angular_devkit/build_webpack');
const relativeBuilderPath = relative(workspaceRoot, builderPath);


// Workspace and options need to be created from functions because JSON Schema validation
// will mutate change the objects.
export function makeWorkspace(
  WorkspaceTargets: WorkspaceTarget<{}> | WorkspaceTarget<{}>[],
): Workspace {
  if (!Array.isArray(WorkspaceTargets)) {
    WorkspaceTargets = [WorkspaceTargets];
  }

  const workspace: Workspace = {
    name: 'spec',
    version: 1,
    root: '',
    defaultProject: 'app',
    projects: {
      app: {
        root: 'src',
        projectType: 'application',
        targets: {},
      },
    },
  };

  WorkspaceTargets.forEach(WorkspaceTarget => {
    workspace.projects.app.targets[WorkspaceTarget.builder] = {
      builder: `${getSystemPath(relativeBuilderPath)}:${WorkspaceTarget.builder}`,
      options: WorkspaceTarget.options,
    } as WorkspaceTarget;
    // Last spec target is the default.
    workspace.projects.app.defaultTarget = WorkspaceTarget.builder;
  });

  return workspace;
}

export const browserWorkspaceTarget: WorkspaceTarget<Partial<BrowserBuilderOptions>> = {
  builder: 'browser',
  options: {
    outputPath: '../dist',
    index: 'index.html',
    main: 'main.ts',
    polyfills: 'polyfills.ts',
    tsConfig: 'tsconfig.app.json',
    progress: false,
    aot: false,
    styles: [{ input: 'styles.css', lazy: false }],
    scripts: [],
    assets: [
      { glob: 'favicon.ico', input: './', output: './', allowOutsideOutDir: false },
      { glob: '**/*', input: 'assets', output: 'assets', allowOutsideOutDir: false },
    ],
  },
};

export const devServerWorkspaceTarget: WorkspaceTarget<Partial<DevServerBuilderOptions>> = {
  builder: 'devServer',
  options: {
    browserTarget: 'app:browser',
    watch: false,
  },
};

export const extractI18nWorkspaceTarget: WorkspaceTarget<Partial<ExtractI18nBuilderOptions>> = {
  builder: 'extractI18n',
  options: {
    browserTarget: 'app:browser',
  },
};

export const karmaWorkspaceTarget: WorkspaceTarget<Partial<KarmaBuilderOptions>> = {
  builder: 'karma',
  options: {
    main: 'test.ts',
    polyfills: 'polyfills.ts',
    // Use Chrome Headless for CI envs.
    browsers: 'ChromeHeadless',
    tsConfig: 'tsconfig.spec.json',
    karmaConfig: '../karma.conf.js',
    progress: false,
    styles: [{ input: 'styles.css', lazy: false }],
    scripts: [],
    assets: [
      { glob: 'favicon.ico', input: './', output: './', allowOutsideOutDir: false },
      { glob: '**/*', input: 'assets', output: 'assets', allowOutsideOutDir: false },
    ],
  },
};

export const protractorWorkspaceTarget: WorkspaceTarget<Partial<ProtractorBuilderOptions>> = {
  builder: 'protractor',
  options: {
    protractorConfig: '../protractor.conf.js',
    devServerTarget: 'app:devServer',
  },
};

export const tslintWorkspaceTarget: WorkspaceTarget<Partial<TslintBuilderOptions>> = {
  builder: 'tslint',
  options: {
    tsConfig: 'tsconfig.app.json',
    exclude: ['**/node_modules/**'],
  },
};
