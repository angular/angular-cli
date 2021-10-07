/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// eslint-disable-next-line import/no-unassigned-import
import 'zone.js';
// eslint-disable-next-line import/no-unassigned-import
import '@angular/compiler';
import { destroyPlatform, getPlatform } from '@angular/core';
import { Request, Server, ServerInjectResponse } from '@hapi/hapi';
import { ngHapiEngine } from '@nguniversal/hapi-engine';
import { ExampleModule } from './mock.server.module';

describe('test runner', () => {
  const server = new Server({ debug: false });
  server.route([
    {
      method: 'GET',
      path: '/',
      handler: (req: Request) =>
        ngHapiEngine({
          bootstrap: ExampleModule,
          req,
          document: '<html><body><app></app></body></html>',
        }),
    },
    {
      method: 'GET',
      path: '/test',
      handler: () => 'ok',
    },
  ]);

  beforeEach(() => {
    if (getPlatform()) {
      destroyPlatform();
    }
  });

  it('should test the server', async () => {
    const request = {
      method: 'GET',
      url: '/test',
    };

    const res = await server.inject(request);
    expect(res.result).toBeDefined();
    expect(res.result).toBe('ok' as any);
  });

  it('Returns a reply on successful request', async () => {
    const request = {
      method: 'GET',
      url: '/',
    };

    const res: ServerInjectResponse = await server.inject(request);
    expect(res.result).toBeDefined();
    expect(res.result).toContain('Works!');
  });
});
