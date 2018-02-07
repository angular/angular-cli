/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect, Workspace } from '@angular-devkit/architect';
import { normalize } from '@angular-devkit/core';
import { NodeJsSyncHost } from '@angular-devkit/core/node';
import { existsSync, readFileSync } from 'fs';
import { relative, resolve } from 'path';
import { concatMap, tap, toArray } from 'rxjs/operators';

const devkitRoot = (global as any)._DevKitRoot; // tslint:disable-line:no-any
const root = resolve(devkitRoot, 'tests/@angular_devkit/build_webpack/hello-world-app/');
const builderPath = resolve(devkitRoot, 'packages/angular_devkit/build_webpack');
const relativeBuilderPath = relative(root, builderPath);
const outputPath = resolve(root, 'dist');
const host = new NodeJsSyncHost();

export const getWorkspace = (): Workspace => ({
  name: 'spec',
  version: 1,
  root: '',
  defaultProject: 'app',
  projects: {
    app: {
      root: 'src',
      projectType: 'application',
      defaultTarget: 'browser',
      targets: {
        browser: {
          builder: `${relativeBuilderPath}:browser`,
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
              { glob: '**/*', input: 'assets', output: './', allowOutsideOutDir: false },
            ],
          },
        },
      },
    },
  },
});

describe('Browser Builder', () => {
  it('builds targets', (done) => {
    const architect = new Architect(normalize(root), host);
    architect.loadWorkspaceFromJson(getWorkspace()).pipe(
      concatMap((architect) => architect.run(architect.getTarget())),
      toArray(),
      tap(events => expect(events.length).toBe(1)),
      tap(() => {
        expect(existsSync(resolve(outputPath, 'inline.bundle.js'))).toBe(true);
        expect(existsSync(resolve(outputPath, 'main.bundle.js'))).toBe(true);
        expect(existsSync(resolve(outputPath, 'polyfills.bundle.js'))).toBe(true);
        expect(existsSync(resolve(outputPath, 'styles.bundle.js'))).toBe(true);
        expect(existsSync(resolve(outputPath, 'vendor.bundle.js'))).toBe(true);
        expect(existsSync(resolve(outputPath, 'favicon.ico'))).toBe(true);
        expect(existsSync(resolve(outputPath, 'index.html'))).toBe(true);
      }),
    ).subscribe(done, done.fail);
  }, 30000);

  it('builds aot target', (done) => {
    const workspace = getWorkspace();
    workspace.projects.app.targets.browser.options.aot = true;

    const architect = new Architect(normalize(root), host);
    architect.loadWorkspaceFromJson(workspace).pipe(
      concatMap((architect) => architect.run(architect.getTarget())),
      toArray(),
      tap(events => expect(events.length).toBe(1)),
      tap(() => {
        const mainBundlePath = resolve(outputPath, 'main.bundle.js');
        expect(existsSync(mainBundlePath)).toBe(true);
        expect(readFileSync(mainBundlePath, 'utf-8')).toMatch(
          /platformBrowser.*bootstrapModuleFactory.*AppModuleNgFactory/);
      }),
    ).subscribe(done, done.fail);
  }, 30000);
});
