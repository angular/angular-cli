/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Architect } from '@angular-devkit/architect';
import { WorkspaceNodeModulesArchitectHost } from '@angular-devkit/architect/node';
import { TestingArchitectHost } from '@angular-devkit/architect/testing';
import { join, normalize, schema, workspaces } from '@angular-devkit/core';
import { NodeJsSyncHost } from '@angular-devkit/core/node';
import * as path from 'path';
import { BuildResult } from './index';

const devkitRoot = (global as any)._DevKitRoot; // tslint:disable-line:no-any


describe('Webpack Builder basic test', () => {
  let testArchitectHost: TestingArchitectHost;
  let architect: Architect;
  let vfHost: NodeJsSyncHost;

  async function createArchitect(workspaceRoot: string) {
    vfHost = new NodeJsSyncHost();

    const registry = new schema.CoreSchemaRegistry();
    registry.addPostTransform(schema.transforms.addUndefinedDefaults);

    const { workspace } = await workspaces.readWorkspace(
      workspaceRoot,
      workspaces.createWorkspaceHost(vfHost),
    );

    testArchitectHost = new TestingArchitectHost(workspaceRoot, workspaceRoot,
      new WorkspaceNodeModulesArchitectHost(workspace, workspaceRoot));
    architect = new Architect(testArchitectHost, registry);
  }

  describe('basic app', () => {
    const workspaceRoot = path.join(devkitRoot, 'tests/angular_devkit/build_webpack/basic-app/');
    const outputPath = join(normalize(workspaceRoot), 'dist');

    beforeEach(async () => {
      await createArchitect(workspaceRoot);
    });

    it('works', async () => {
      const run = await architect.scheduleTarget({ project: 'app', target: 'build' });
      const output = await run.result;

      expect(output.success).toBe(true);
      expect(await vfHost.exists(join(outputPath, 'bundle.js')).toPromise()).toBe(true);
      await run.stop();
    });

    it('works and returns emitted files', async () => {
      const run = await architect.scheduleTarget({ project: 'app', target: 'build' });
      const output = await run.result as BuildResult;

      expect(output.success).toBe(true);
      expect(output.emittedFiles).toContain({
        name: 'main',
        initial: true,
        file: 'bundle.js',
        extension: '.js',
      });

      await run.stop();
    });
  });

  describe('Angular app', () => {
    const workspaceRoot = path.join(devkitRoot, 'tests/angular_devkit/build_webpack/angular-app/');
    const outputPath = join(normalize(workspaceRoot), 'dist/');

    beforeEach(async () => {
      await createArchitect(workspaceRoot);
    });

    it('works', async () => {
      const run = await architect.scheduleTarget({ project: 'app', target: 'build-webpack' });
      const output = await run.result;

      expect(output.success).toBe(true);
      expect(await vfHost.exists(join(outputPath, 'main.js')).toPromise()).toBe(true);
      expect(await vfHost.exists(join(outputPath, 'polyfills.js')).toPromise()).toBe(true);
      await run.stop();
    });

    it('works and returns emitted files', async () => {
      const run = await architect.scheduleTarget({ project: 'app', target: 'build-webpack' });
      const output = await run.result as BuildResult;

      expect(output.success).toBe(true);
      expect(output.emittedFiles).toContain(
        { name: 'main', initial: true, file: 'main.js', extension: '.js' },
        { name: 'polyfills', initial: true, file: 'polyfills.js', extension: '.js' },
      );

      await run.stop();
    });
  });
});
