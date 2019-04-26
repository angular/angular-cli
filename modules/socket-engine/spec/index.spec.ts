import { SOME_TOKEN } from '../testing/mock.server.module';
import {
  MockServerModuleNgFactory,
  ErrorServerModuleNgFactory,
  TokenServerModuleNgFactory
} from '../testing/mock.server.module.ngfactory';
import 'zone.js';

import { startSocketEngine, SocketEngineResponse,
  SocketEngineRenderOptions } from '@nguniversal/socket-engine';
import * as net from 'net';

async function sendAndRecieve(renderOptions: SocketEngineRenderOptions) {
  return new Promise<SocketEngineResponse>(async(resolve, _reject) => {

    const server = await startSocketEngine(MockServerModuleNgFactory);

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
    const renderOptions = {id: 1, url: '/path',
        document: '<root></root>'} as SocketEngineRenderOptions;
    const result = await sendAndRecieve(renderOptions);
    expect(result.html).toContain('some template');
  });

  it('should return the same id', async () => {
    const id = Math.random();
    const renderOptions = {id , url: '/path',
        document: '<root></root>'} as SocketEngineRenderOptions;
    const result = await sendAndRecieve(renderOptions);
    expect(result.id).toEqual(id);
  });

  it('should return an error if it cant render', async (done) => {
    const server = await startSocketEngine(ErrorServerModuleNgFactory);

    const client = net.createConnection(9090, 'localhost', () => {
      const renderOptions = {id: 1, url: '/path',
      document: '<root></root>'} as SocketEngineRenderOptions;
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
    const renderOptions = {id: 1, url: '/path',
        document: '<root></root>'} as SocketEngineRenderOptions;
    const result = await sendAndRecieve(renderOptions);
    expect(result.error).toBeUndefined();
  });

  it('should be able to inject some token', async (done) => {
    const someValue = {message: 'value' + new Date()};
    const server =
      await startSocketEngine(
        TokenServerModuleNgFactory, [{provide: SOME_TOKEN, useValue: someValue}]);

    const client = net.createConnection(9090, 'localhost', () => {
      const renderOptions = {id: 1, url: '/path',
      document: '<root></root>'} as SocketEngineRenderOptions;
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
