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
import { schema, workspaces } from '@angular-devkit/core'; // tslint:disable-line:no-implicit-dependencies
import { NodeJsSyncHost } from '@angular-devkit/core/node'; // tslint:disable-line:no-implicit-dependencies
import fetch from 'node-fetch';  // tslint:disable-line:no-implicit-dependencies
import * as path from 'path';
import { DevServerBuildOutput } from './index';


describe('Dev Server Builder', () => {
  let testArchitectHost: TestingArchitectHost;
  let architect: Architect;
  let vfHost: NodeJsSyncHost;

  const webpackTargetSpec = { project: 'app', target: 'serve' };

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

  beforeEach(async () => {
    const ngJsonPath = path.join(__dirname, '../../test/basic-app/angular.json');
    const workspaceRoot = path.dirname(require.resolve(ngJsonPath));
    await createArchitect(workspaceRoot);
  });

  it('works', async () => {
    const run = await architect.scheduleTarget(webpackTargetSpec);
    const output = await run.result as DevServerBuildOutput;
    expect(output.success).toBe(true);

    const response = await fetch(`http://${output.address}:${output.port}/bundle.js`);
    expect(await response.text()).toContain(`console.log('hello world')`);

    await run.stop();
  }, 30000);

  it('works and returns emitted files', async () => {
    const run = await architect.scheduleTarget(webpackTargetSpec);
    const output = await run.result as DevServerBuildOutput;

    expect(output.success).toBe(true);
    expect(output.emittedFiles).toContain({
      id: 'main',
      name: 'main',
      initial: true,
      file: 'bundle.js',
      extension: '.js',
    });
    await run.stop();
  }, 30000);
});
