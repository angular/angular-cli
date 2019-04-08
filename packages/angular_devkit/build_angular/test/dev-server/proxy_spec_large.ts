/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Architect, BuilderRun } from '@angular-devkit/architect';
import * as express from 'express'; // tslint:disable-line:no-implicit-dependencies
import * as http from 'http';
import { AddressInfo } from 'net';
import fetch from 'node-fetch';  // tslint:disable-line:no-implicit-dependencies
import { DevServerBuilderOutput } from '../../src/dev-server';
import { Schema as DevServerBuilderOptions } from '../../src/dev-server/schema';
import { createArchitect, host } from '../utils';


describe('Dev Server Builder proxy', () => {
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
    // Create an express app that serves as a proxy.
    const app = express();
    const server = http.createServer(app);
    server.listen(0);

    app.set('port', (server.address() as AddressInfo).port);
    app.get('/api/test', function (_req, res) {
      res.send('TEST_API_RETURN');
    });

    const backendHost = 'localhost';
    // cast is safe, the HTTP server is not using a pipe or UNIX domain socket
    const backendPort = (server.address() as AddressInfo).port;
    const proxyServerUrl = `http://${backendHost}:${backendPort}`;

    host.writeMultipleFiles({
      'proxy.config.json': `{ "/api/*": { "target": "${proxyServerUrl}" } }`,
    });

    const run = await architect.scheduleTarget(target, { proxyConfig: 'proxy.config.json' });
    runs.push(run);
    const output = await run.result as DevServerBuilderOutput;
    expect(output.success).toBe(true);
    expect(output.baseUrl).toBe('http://localhost:4200/');

    const response = await fetch('http://localhost:4200/api/test');
    expect(await response.text()).toContain('TEST_API_RETURN');
    server.close();
  }, 30000);

  it('errors out with a missing proxy file', async () => {
    const run = await architect.scheduleTarget(target, { proxyConfig: 'INVALID.json' });
    runs.push(run);

    try {
      await run.result;
      expect('THE ABOVE LINE SHOULD THROW').toBe('true');
    } catch {
      // Success!
    }
  }, 30000);
});
