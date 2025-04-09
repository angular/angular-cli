/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect } from '@angular-devkit/architect';
// eslint-disable-next-line import/no-extraneous-dependencies
import * as browserSync from 'browser-sync';
// eslint-disable-next-line import/no-extraneous-dependencies
import { Agent, getGlobalDispatcher, setGlobalDispatcher } from 'undici';
import { createArchitect, host } from '../../../testing/test-utils';
import { SSRDevServerBuilderOutput } from '../index';

describe('Serve SSR Builder', () => {
  const target = { project: 'app', target: 'serve-ssr' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;

    host.writeMultipleFiles({
      'src/main.server.ts': `
        import 'zone.js/node';

        import { CommonEngine } from '@angular/ssr';
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

          server.get('*.*', express.static(distFolder, {
            maxAge: '1y'
          }));

          server.get('*', (req, res, next) => {
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

  it('works with SSL', async () => {
    const run = await architect.scheduleTarget(target, { ssl: true, port: 0 });
    const output = (await run.result) as SSRDevServerBuilderOutput;

    expect(output.success).toBe(true);
    expect(output.baseUrl).toBe(`https://localhost:${output.port}`);

    // The self-signed certificate used by the dev server will cause fetch to fail
    // unless reject unauthorized is disabled.
    const originalDispatcher = getGlobalDispatcher();
    setGlobalDispatcher(
      new Agent({
        connect: { rejectUnauthorized: false },
      }),
    );
    try {
      const response = await fetch(`https://localhost:${output.port}/index.html`);
      expect(await response.text()).toContain('<title>HelloWorldApp</title>');
    } finally {
      setGlobalDispatcher(originalDispatcher);
    }

    await run.stop();
  });
});
