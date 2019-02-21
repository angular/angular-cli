/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { experimental, join, normalize, schema } from '@angular-devkit/core';
import { NodeJsSyncHost } from '@angular-devkit/core/node';
import * as fs from 'fs';
import * as path from 'path';
import { WorkspaceNodeModulesArchitectHost } from '../../../architect/node';
import { Architect } from '../../../architect/src/architect';
import { TestingArchitectHost } from '../../../architect/testing/testing-architect-host';

const devkitRoot = normalize((global as any)._DevKitRoot); // tslint:disable-line:no-any


describe('Webpack Builder basic test', () => {
  let testArchitectHost: TestingArchitectHost;
  let architect: Architect;
  let vfHost: NodeJsSyncHost;

  async function createArchitect(workspaceRoot: string) {
    vfHost = new NodeJsSyncHost();
    const configContent = fs.readFileSync(path.join(workspaceRoot, 'angular.json'), 'utf-8');
    const workspaceJson = JSON.parse(configContent);

    const registry = new schema.CoreSchemaRegistry();
    registry.addPostTransform(schema.transforms.addUndefinedDefaults);

    const workspace = new experimental.workspace.Workspace(normalize(workspaceRoot), vfHost);
    await workspace.loadWorkspaceFromJson(workspaceJson).toPromise();

    testArchitectHost = new TestingArchitectHost(workspaceRoot, workspaceRoot,
      new WorkspaceNodeModulesArchitectHost(workspace, workspaceRoot));
    architect = new Architect(testArchitectHost, registry);
  }

  describe('basic app', () => {
    const workspaceRoot = join(devkitRoot, 'tests/angular_devkit/build_webpack/basic-app/');
    const outputPath = join(workspaceRoot, 'dist');

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
  });

  describe('Angular app', () => {
    const workspaceRoot = join(devkitRoot, 'tests/angular_devkit/build_webpack/angular-app/');
    const outputPath = join(workspaceRoot, 'dist/');

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
  });
});
