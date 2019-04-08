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


describe('Dev Server Builder serve path', () => {
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
    const run = await architect.scheduleTarget(target, { servePath: 'test/' });
    runs.push(run);
    const output = await run.result as DevServerBuilderOutput;
    expect(output.success).toBe(true);
    expect(output.baseUrl).toBe('http://localhost:4200/test');

    const response = await fetch(`${output.baseUrl}/polyfills.js`);
    expect(await response.text()).toContain('window["webpackJsonp"]');
  }, 30000);
});
