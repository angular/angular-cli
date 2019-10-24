/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Architect, BuilderRun } from '@angular-devkit/architect';
import fetch from 'node-fetch';  // tslint:disable-line:no-implicit-dependencies
import { DevServerBuilderOutput } from '../../src/dev-server';
import { createArchitect, host } from '../utils';


describe('Dev Server Builder public host', () => {
  // We have to spoof the host to a non-numeric one because Webpack Dev Server does not
  // check the hosts anymore when requests come from numeric IP addresses.
  const headers = { host: 'spoofy.mcspoofface' };

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

  it('works', async () => {
    const run = await architect.scheduleTarget(target);
    runs.push(run);
    const output = await run.result as DevServerBuilderOutput;
    expect(output.success).toBe(true);
    expect(output.baseUrl).toBe('http://localhost:4200/');

    const response = await fetch(`${output.baseUrl}`, { headers });
    expect(await response.text()).toContain('Invalid Host header');
  }, 30000);

  it('works',  async () => {
    const run = await architect.scheduleTarget(target, { publicHost: headers.host });
    runs.push(run);
    const output = await run.result as DevServerBuilderOutput;
    expect(output.success).toBe(true);
    expect(output.baseUrl).toBe('http://localhost:4200/');

    const response = await fetch(`${output.baseUrl}`, { headers });
    expect(await response.text()).toContain('<title>HelloWorldApp</title>');
  }, 30000);

  it('works', async () => {
    const run = await architect.scheduleTarget(target, { disableHostCheck: true });
    runs.push(run);
    const output = await run.result as DevServerBuilderOutput;
    expect(output.success).toBe(true);
    expect(output.baseUrl).toBe('http://localhost:4200/');

    const response = await fetch(`${output.baseUrl}`, { headers });
    expect(await response.text()).toContain('<title>HelloWorldApp</title>');
  }, 30000);
});
