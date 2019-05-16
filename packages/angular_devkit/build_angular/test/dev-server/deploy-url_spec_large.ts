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


describe('Dev Server Deploy Url', () => {
  const target = { project: 'app', target: 'serve' };
  let architect: Architect;
  let runs: BuilderRun[] = [];

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
    const run = await architect.scheduleTarget(target, { deployUrl: 'test/' });
    runs.push(run);
    const output = await run.result as DevServerBuilderOutput;
    expect(output.success).toBe(true);
    expect(output.baseUrl).toBe('http://localhost:4200/test');

    const response = await fetch(`${output.baseUrl}/polyfills.js`);
    expect(await response.text()).toContain('window["webpackJsonp"]');
  }, 30000);
});
