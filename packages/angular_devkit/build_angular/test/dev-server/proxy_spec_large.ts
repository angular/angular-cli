/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { request, runTargetSpec } from '@angular-devkit/architect/testing';
import * as express from 'express'; // tslint:disable-line:no-implicit-dependencies
import * as http from 'http';
import { from } from 'rxjs';
import { concatMap, take, tap } from 'rxjs/operators';
import { DevServerBuilderOptions } from '../../src';
import { devServerTargetSpec, host } from '../utils';


describe('Dev Server Builder proxy', () => {
  beforeEach(done => host.initialize().toPromise().then(done, done.fail));
  afterEach(done => host.restore().toPromise().then(done, done.fail));

  it('works', (done) => {
    // Create an express app that serves as a proxy.
    const app = express();
    const server = http.createServer(app);
    server.listen(0);

    app.set('port', server.address().port);
    app.get('/api/test', function (_req, res) {
      res.send('TEST_API_RETURN');
    });

    const backendHost = 'localhost';
    const backendPort = server.address().port;
    const proxyServerUrl = `http://${backendHost}:${backendPort}`;

    host.writeMultipleFiles({
      'proxy.config.json': `{ "/api/*": { "target": "${proxyServerUrl}" } }`,
    });

    const overrides: Partial<DevServerBuilderOptions> = { proxyConfig: 'proxy.config.json' };

    runTargetSpec(host, devServerTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      concatMap(() => from(request('http://localhost:4200/api/test'))),
      tap(response => {
        expect(response).toContain('TEST_API_RETURN');
        server.close();
      }),
      take(1),
    ).toPromise().then(done, done.fail);
  }, 30000);

  it('errors out with a missing proxy file', (done) => {
    const overrides: Partial<DevServerBuilderOptions> = { proxyConfig: '../proxy.config.json' };

    runTargetSpec(host, devServerTargetSpec, overrides)
      .subscribe(undefined, () => done(), done.fail);
  }, 30000);
});
