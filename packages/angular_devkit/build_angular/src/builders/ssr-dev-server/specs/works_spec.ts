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
import fetch from 'node-fetch'; // eslint-disable-line import/no-extraneous-dependencies
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
    browserSync.reset();
    await host.restore().toPromise();
  });

  it('works', async () => {
    const run = await architect.scheduleTarget(target);
    const output = await run.result;
    expect(output.success).toBe(true);
    const response = await fetch(`http://localhost:${output.port}/`);
    await run.stop();

    expect(await response.text()).toContain('<title>HelloWorldApp</title>');
  });

  it('works with port 0', async () => {
    const run = await architect.scheduleTarget(target, { port: 0 });
    const output = (await run.result) as SSRDevServerBuilderOutput;
    await run.stop();

    expect(output.success).toBe(true);
    expect(output.baseUrl).not.toContain('4200');
  });
});
