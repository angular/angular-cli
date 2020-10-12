/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Architect, BuilderRun } from '@angular-devkit/architect';
import { DevServerBuilderOutput } from '@angular-devkit/build-angular';
import fetch from 'node-fetch'; // tslint:disable-line:no-implicit-dependencies
import { createArchitect, host } from '../test-utils';


describe('Dev Server Builder hmr', () => {
  const target = { project: 'app', target: 'serve' };
  let architect: Architect;
  // We use runs like this to ensure it WILL stop the servers at the end of each tests.
  let runs: BuilderRun[];

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
    runs = [];
  });
  afterEach(async () => {
    await host.restore().toPromise();
    await Promise.all(runs.map(r => r.stop()));
  });

  it('adds HMR accept code in all JS bundles', async () => {
    const run = await architect.scheduleTarget(target, { hmr: true });
    runs.push(run);
    const output = await run.result as DevServerBuilderOutput;
    expect(output.success).toBe(true);
    expect(output.baseUrl).toBe('https://localhost:4200/');

    const polyfills = await fetch('https://localhost:4200/polyfills.js');
    expect(await polyfills.text()).toContain('ngHmrAccept(module);');

    const main = await fetch('https://localhost:4200/main.js');
    expect(await main.text()).toContain('ngHmrAccept(module);');
  }, 30000);
});
