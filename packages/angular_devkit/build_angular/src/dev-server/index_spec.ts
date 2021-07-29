/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { DevServerBuilderOutput } from '@angular-devkit/build-angular';
import { workspaces } from '@angular-devkit/core';
import fetch from 'node-fetch'; // eslint-disable-line import/no-extraneous-dependencies
import { createArchitect, host } from '../testing/test-utils';

describe('Dev Server Builder index', () => {
  const targetSpec = { project: 'app', target: 'serve' };

  beforeEach(async () => host.initialize().toPromise());
  afterEach(async () => host.restore().toPromise());

  it('sets HTML lang attribute with the active locale', async () => {
    const locale = 'fr';
    const { workspace } = await workspaces.readWorkspace(
      host.root(),
      workspaces.createWorkspaceHost(host),
    );
    const app = workspace.projects.get('app');
    if (!app) {
      fail('Test application "app" not found.');

      return;
    }

    app.extensions['i18n'] = {
      locales: {
        [locale]: [],
      },
    };

    const target = app.targets.get('build');
    if (!target) {
      fail('Test application "app" target "build" not found.');

      return;
    }
    if (!target.options) {
      target.options = {};
    }
    target.options.localize = [locale];

    await workspaces.writeWorkspace(workspace, workspaces.createWorkspaceHost(host));

    const architect = (await createArchitect(host.root())).architect;
    const run = await architect.scheduleTarget(targetSpec, { port: 0 });
    const output = (await run.result) as DevServerBuilderOutput;
    expect(output.success).toBe(true);
    const response = await fetch(output.baseUrl);
    expect(await response.text()).toContain(`lang="${locale}"`);
    await run.stop();
  });
});
