/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect, BuilderRun } from '@angular-devkit/architect';
import * as browserSync from 'browser-sync';
import * as http from 'http';
import * as https from 'https';
import fetch from 'node-fetch'; // eslint-disable-line import/no-extraneous-dependencies
import { createArchitect, host } from '../../testing/test-utils';
import { SSRDevServerBuilderOutput } from './index';

describe('Serve SSR Builder', () => {
  const target = { project: 'app', target: 'serve-ssr' };
  let architect: Architect;
  let runs: BuilderRun[] = [];

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;

    host.writeMultipleFiles({
      'src/main.server.ts': `
        import 'zone.js/node';

        import { ngExpressEngine } from '@angular/ssr';
        import * as express from 'express';
        import { resolve } from 'node:path';
        import { AppServerModule } from './app/app.module.server';

        export function app(): express.Express {
          const server = express();
          const distFolder = resolve(__dirname, '../dist');

          server.engine('html', ngExpressEngine({
            bootstrap: AppServerModule
          }));

          server.set('view engine', 'html');
          server.set('views', distFolder);

          server.get('*.*', express.static(distFolder, {
            maxAge: '1y'
          }));

          server.get('*', (req, res) => {
            res.render('index', {
              url: req.originalUrl,
            });
          });

          return server;
        }

        app().listen(process.env['PORT']);

        export * from './app/app.module.server';
      `,
    });
  });

  afterEach(async () => {
    await Promise.all(runs.map((r) => r.stop()));
    browserSync.reset();
    await host.restore().toPromise();
    runs = [];
  });

  it('works', async () => {
    const run = await architect.scheduleTarget(target);
    const output = await run.result;
    expect(output.success).toBe(true);

    const response = await fetch(`http://localhost:${output.port}/`);

    expect(await response.text()).toContain('<title>HelloWorldApp</title>');
  });

  it('works with port 0', async () => {
    const run = await architect.scheduleTarget(target, { port: 0 });
    runs.push(run);
    const output = (await run.result) as SSRDevServerBuilderOutput;
    expect(output.success).toBe(true);
    expect(output.baseUrl).not.toContain('4200');
  });

  it('works with SSL', async () => {
    const run = await architect.scheduleTarget(target, { ssl: true, port: 0 });
    runs.push(run);
    const output = (await run.result) as SSRDevServerBuilderOutput;
    expect(output.success).toBe(true);
    expect(output.baseUrl).toBe(`https://localhost:${output.port}`);

    const response = await fetch(`https://localhost:${output.port}/index.html`, {
      agent: new https.Agent({ rejectUnauthorized: false }),
    });

    expect(await response.text()).toContain('<title>HelloWorldApp</title>');
  });

  it('proxies requests based on the proxy configuration file provided in the option', async () => {
    const proxyServer = http.createServer((request, response) => {
      if (request.url?.endsWith('/test')) {
        response.writeHead(200);
        response.end('TEST_API_RETURN');
      } else {
        response.writeHead(404);
        response.end();
      }
    });

    try {
      await new Promise<void>((resolve) => proxyServer.listen(0, '127.0.0.1', resolve));
      const proxyAddress = proxyServer.address() as import('net').AddressInfo;

      host.writeMultipleFiles({
        'proxy.config.json': `{ "/api/*": { "logLevel": "debug","target": "http://127.0.0.1:${proxyAddress.port}" } }`,
      });

      const run = await architect.scheduleTarget(target, {
        port: 0,
        proxyConfig: 'proxy.config.json',
      });
      runs.push(run);

      const output = (await run.result) as SSRDevServerBuilderOutput;
      expect(output.success).toBe(true);
      expect(output.baseUrl).toBe(`http://localhost:${output.port}`);
      const response = await fetch(`http://localhost:${output.port}/api/test`);
      expect(await response?.text()).toContain('TEST_API_RETURN');
    } finally {
      await new Promise<void>((resolve) => proxyServer.close(() => resolve()));
    }
  });
});
