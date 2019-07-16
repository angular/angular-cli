/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { workspaces } from '@angular-devkit/core';
import fetch from 'node-fetch'; // tslint:disable-line:no-implicit-dependencies
import { DevServerBuilderOutput } from '../../src/dev-server/index';
import { createArchitect, host } from '../utils';

describe('Dev Server Builder index', () => {
  const targetSpec = { project: 'app', target: 'serve' };

  beforeEach(async () => host.initialize().toPromise());
  afterEach(async () => host.restore().toPromise());

  it(`adds 'type="module"' when differential loading is needed`, async () => {
    host.writeMultipleFiles({
      browserslist: `
        last 1 chrome version
        IE 10
      `,
    });

    const architect = (await createArchitect(host.root())).architect;
    const run = await architect.scheduleTarget(targetSpec);
    const output = (await run.result) as DevServerBuilderOutput;
    expect(output.success).toBe(true);
    const response = await fetch('http://localhost:4200/index.html');
    expect(await response.text()).toContain(
      '<script src="runtime.js" type="module"></script>' +
        '<script src="polyfills.js" type="module"></script>' +
        '<script src="styles.js" type="module"></script>' +
        '<script src="vendor.js" type="module"></script>' +
        '<script src="main.js" type="module"></script>',
    );
    await run.stop();
  });

  it(`does not add 'type="module"' to custom scripts when differential loading is needed`, async () => {
    host.writeMultipleFiles({
      browserslist: `
        last 1 chrome version
        IE 10
      `,
      'test.js': 'console.log("test");',
    });

    const { workspace } = await workspaces.readWorkspace(host.root(), workspaces.createWorkspaceHost(host));
    const app = workspace.projects.get('app');
    if (!app) {
      fail('Test application "app" not found.');

      return;
    }
    const target = app.targets.get('build');
    if (!target) {
      fail('Test application "app" target "build" not found.');

      return;
    }
    if (!target.options) {
      target.options = {};
    }
    target.options.scripts = ['test.js'];
    await workspaces.writeWorkspace(workspace, workspaces.createWorkspaceHost(host));

    const architect = (await createArchitect(host.root())).architect;
    const run = await architect.scheduleTarget(targetSpec);
    const output = (await run.result) as DevServerBuilderOutput;
    expect(output.success).toBe(true);
    const response = await fetch('http://localhost:4200/index.html');
    expect(await response.text()).toContain(
      '<script src="runtime.js" type="module"></script>' +
        '<script src="polyfills.js" type="module"></script>' +
        '<script src="styles.js" type="module"></script>' +
        '<script src="scripts.js" defer></script>' +
        '<script src="vendor.js" type="module"></script>' +
        '<script src="main.js" type="module"></script>',
    );
    await run.stop();
  });

  it(`doesn't 'type="module"' when differential loading is not needed`, async () => {
    host.writeMultipleFiles({
      browserslist: `
        last 1 chrome version
      `,
    });

    const architect = (await createArchitect(host.root())).architect;
    const run = await architect.scheduleTarget(targetSpec);
    const output = (await run.result) as DevServerBuilderOutput;
    expect(output.success).toBe(true);
    const response = await fetch('http://localhost:4200/index.html');
    expect(await response.text()).toContain(
      '<script src="runtime.js" defer></script>' +
        '<script src="polyfills.js" defer></script>' +
        '<script src="styles.js" defer></script>' +
        '<script src="vendor.js" defer></script>' +
        '<script src="main.js" defer></script>',
    );
    await run.stop();
  });
});
