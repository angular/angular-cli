/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect } from '@angular-devkit/architect';
import { WorkspaceNodeModulesArchitectHost } from '@angular-devkit/architect/node';
import { TestingArchitectHost } from '@angular-devkit/architect/testing';
import { join, normalize, schema, workspaces } from '@angular-devkit/core';
import { NodeJsSyncHost, createConsoleLogger } from '@angular-devkit/core/node';
import * as path from 'path';
import { BuildResult } from './index';

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

    testArchitectHost = new TestingArchitectHost(
      workspaceRoot,
      workspaceRoot,
      new WorkspaceNodeModulesArchitectHost(workspace, workspaceRoot),
    );
    architect = new Architect(testArchitectHost, registry);
  }

  describe('basic app', () => {
    const ngJsonPath = path.join(__dirname, '../../test/basic-app/angular.json');
    const workspaceRoot = path.dirname(require.resolve(ngJsonPath));
    const outputPath = join(normalize(workspaceRoot), 'dist');

    beforeEach(async () => {
      await createArchitect(workspaceRoot);
    });

    it('works with CJS config', async () => {
      const run = await architect.scheduleTarget(
        { project: 'app', target: 'build' },
        { webpackConfig: 'webpack.config.cjs' },
      );
      const output = await run.result;

      expect(output.success).toBe(true);
      expect(await vfHost.exists(join(outputPath, 'bundle.js')).toPromise()).toBe(true);
      await run.stop();
    });

    it('works with ESM config', async () => {
      const run = await architect.scheduleTarget(
        { project: 'app', target: 'build' },
        { webpackConfig: 'webpack.config.mjs' },
      );
      const output = await run.result;

      expect(output.success).toBe(true);
      expect(await vfHost.exists(join(outputPath, 'bundle.js')).toPromise()).toBe(true);
      await run.stop();
    });

    it('works and returns emitted files', async () => {
      const run = await architect.scheduleTarget({ project: 'app', target: 'build' });
      const output = (await run.result) as BuildResult;

      expect(output.success).toBe(true);
      expect(output.emittedFiles).toContain({
        id: 'main',
        name: 'main',
        initial: true,
        file: 'bundle.js',
        extension: '.js',
      });

      await run.stop();
    });
  });

  describe('Angular app', () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 150000;
    const ngJsonPath = path.join(__dirname, '../../test/angular-app/angular.json');
    const workspaceRoot = path.dirname(require.resolve(ngJsonPath));
    const outputPath = join(normalize(workspaceRoot), 'dist');

    beforeEach(async () => {
      await createArchitect(workspaceRoot);
    });

    it('works', async () => {
      const run = await architect.scheduleTarget(
        { project: 'app', target: 'build-webpack' },
        {},
        { logger: createConsoleLogger() },
      );
      const output = await run.result;

      expect(output.success).toBe(true);
      expect(await vfHost.exists(join(outputPath, 'main.js')).toPromise()).toBe(true);
      expect(await vfHost.exists(join(outputPath, 'polyfills.js')).toPromise()).toBe(true);
      await run.stop();
    });

    it('works and returns emitted files', async () => {
      const run = await architect.scheduleTarget({ project: 'app', target: 'build-webpack' });
      const output = (await run.result) as BuildResult;

      expect(output.success).toBe(true);
      expect(output.emittedFiles).toContain(
        { id: 'main', name: 'main', initial: true, file: 'main.js', extension: '.js' },
        {
          id: 'polyfills',
          name: 'polyfills',
          initial: true,
          file: 'polyfills.js',
          extension: '.js',
        },
      );

      await run.stop();
    });
  });
});
