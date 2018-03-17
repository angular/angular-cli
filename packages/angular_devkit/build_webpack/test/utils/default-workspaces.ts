/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Target } from '@angular-devkit/architect';
import { experimental, getSystemPath, join, normalize, relative } from '@angular-devkit/core';
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

export function makeWorkspace(WorkspaceTargets: Target[] ): experimental.workspace.WorkspaceJson {
  const workspace = {
    version: 1,
    projects: {
      app: {
        root: 'src',
        projectType: 'application',
        architect: {} as { [k: string]: Target },
      },
    },
  };

  WorkspaceTargets.forEach(WorkspaceTarget => {
    workspace.projects.app.architect[WorkspaceTarget.builder] = {
      builder: `${getSystemPath(relativeBuilderPath)}:${WorkspaceTarget.builder}`,
      options: WorkspaceTarget.options,
    } as Target;
  });

  return workspace as {} as experimental.workspace.WorkspaceJson;
}

export const browserWorkspaceTarget: Target<Partial<BrowserBuilderOptions>> = {
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

export const devServerWorkspaceTarget: Target<Partial<DevServerBuilderOptions>> = {
  builder: 'dev-server',
  options: {
    browserTarget: 'app:browser',
    watch: false,
  },
};

export const extractI18nWorkspaceTarget: Target<Partial<ExtractI18nBuilderOptions>> = {
  builder: 'extract-i18n',
  options: {
    browserTarget: 'app:browser',
  },
};

export const karmaWorkspaceTarget: Target<Partial<KarmaBuilderOptions>> = {
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

export const protractorWorkspaceTarget: Target<Partial<ProtractorBuilderOptions>> = {
  builder: 'protractor',
  options: {
    protractorConfig: '../protractor.conf.js',
    devServerTarget: 'app:devServer',
    // Webdriver is updated with a specific version on devkit install.
    // This is preferable to updating each time because it can download a new version of
    // chromedriver that is incompatible with the Chrome version on CI.
    webdriverUpdate: false,
  },
};

export const tslintWorkspaceTarget: Target<Partial<TslintBuilderOptions>> = {
  builder: 'tslint',
  options: {
    tsConfig: 'tsconfig.app.json',
    exclude: ['**/node_modules/**'],
  },
};
