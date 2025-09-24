/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Architect } from '@angular-devkit/architect';
// eslint-disable-next-line import/no-extraneous-dependencies
import * as browserSync from 'browser-sync';
import * as http from 'node:http';
import { createArchitect, host } from '../../../testing/test-utils';
import { SSRDevServerBuilderOutput } from '../index';

describe('Serve SSR Builder', () => {
  const target = { project: 'app', target: 'serve-ssr' };
  const originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
  let architect: Architect;

  beforeAll(() => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 100_000;
  });

  afterAll(() => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
  });

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;

    host.writeMultipleFiles({
      'src/main.server.ts': `
        import { CommonEngine } from '@angular/ssr/node';
        import * as express from 'express';
        import { resolve, join } from 'node:path';
        import { AppServerModule } from './app/app.module.server';

        export function app(): express.Express {
          const server = express();
          const distFolder = resolve(__dirname, '../dist');
          const indexHtml = join(distFolder, 'index.html');
          const commonEngine = new CommonEngine();

          server.set('view engine', 'html');
          server.set('views', distFolder);

          server.use(express.static(distFolder, {
            maxAge: '1y',
            index: false,
          }));

          server.use((req, res, next) => {
            commonEngine
              .render({
                bootstrap: AppServerModule,
                documentFilePath: indexHtml,
                url: req.originalUrl,
                publicPath: distFolder,
              })
              .then((html) => res.send(html))
              .catch((err) => next(err));
          });

          return server;
        }

        app().listen(process.env['PORT']);

        export * from './app/app.module.server';
      `,
    });
  });

  afterEach(async () => {
    browserSync.reset();
    await host.restore().toPromise();
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

      const output = (await run.result) as SSRDevServerBuilderOutput;

      expect(output.success).toBe(true);
      expect(output.baseUrl).toBe(`http://localhost:${output.port}`);
      const response = await fetch(`http://localhost:${output.port}/api/test`);
      await run.stop();

      expect(await response?.text()).toContain('TEST_API_RETURN');
    } finally {
      await new Promise<void>((resolve) => proxyServer.close(() => resolve()));
    }
  });
});
