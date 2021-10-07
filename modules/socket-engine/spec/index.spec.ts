/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/* eslint-disable */
import 'zone.js';
import '@angular/compiler';
import {
  SocketEngineRenderOptions,
  SocketEngineResponse,
  startSocketEngine,
} from '@nguniversal/socket-engine';
import * as net from 'net';
import {
  ErrorServerModule,
  MockServerModule,
  SOME_TOKEN,
  TokenServerModule,
} from './mock.server.module';

async function sendAndRecieve(renderOptions: SocketEngineRenderOptions) {
  return new Promise<SocketEngineResponse>(async (resolve, _reject) => {
    const server = await startSocketEngine(MockServerModule);

    const client = net.createConnection(9090, 'localhost', () => {
      client.write(JSON.stringify(renderOptions));
    });

    client.on('data', (data: Buffer) => {
      const res = JSON.parse(data.toString()) as SocketEngineResponse;
      server.close();
      resolve(res);
    });
  });
}

describe('test runner', () => {
  it('should render a basic template', async () => {
    const renderOptions = {
      id: 1,
      url: '/path',
      document: '<root></root>',
    } as SocketEngineRenderOptions;
    const result = await sendAndRecieve(renderOptions);
    expect(result.html).toContain('some template');
  });

  it('should return the same id', async () => {
    const id = Math.random();
    const renderOptions = {
      id,
      url: '/path',
      document: '<root></root>',
    } as SocketEngineRenderOptions;
    const result = await sendAndRecieve(renderOptions);
    expect(result.id).toEqual(id);
  });

  it('should return an error if it cant render', async (done) => {
    const server = await startSocketEngine(ErrorServerModule);

    const client = net.createConnection(9090, 'localhost', () => {
      const renderOptions = {
        id: 1,
        url: '/path',
        document: '<root></root>',
      } as SocketEngineRenderOptions;
      client.write(JSON.stringify(renderOptions));
    });

    client.on('data', (data: Buffer) => {
      const res = JSON.parse(data.toString()) as SocketEngineResponse;
      server.close();
      expect(res.error).not.toBeNull();
      done();
    });
  });

  it('should not return an error if it can render', async () => {
    const renderOptions = {
      id: 1,
      url: '/path',
      document: '<root></root>',
    } as SocketEngineRenderOptions;
    const result = await sendAndRecieve(renderOptions);
    expect(result.error).toBeUndefined();
  });

  it('should be able to inject some token', async (done) => {
    const someValue = { message: 'value' + new Date() };
    const server = await startSocketEngine(TokenServerModule, [
      { provide: SOME_TOKEN, useValue: someValue },
    ]);

    const client = net.createConnection(9090, 'localhost', () => {
      const renderOptions = {
        id: 1,
        url: '/path',
        document: '<root></root>',
      } as SocketEngineRenderOptions;
      client.write(JSON.stringify(renderOptions));
    });

    client.on('data', (data: Buffer) => {
      const res = JSON.parse(data.toString()) as SocketEngineResponse;
      server.close();
      expect(res.html).toContain(someValue.message);
      done();
    });
  });
});
