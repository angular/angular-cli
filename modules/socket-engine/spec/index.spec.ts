
import { ServerModule } from '@angular/platform-server';
import { NgModule, Component, Inject, InjectionToken } from '@angular/core';
import 'zone.js';

import { BrowserModule } from '@angular/platform-browser';
import { startSocketEngine, SocketEngineResponse,
  SocketEngineRenderOptions } from '@nguniversal/socket-engine';
import * as net from 'net';

export function makeTestingModule(template: string, component?: any): any {
  @Component({
    selector: 'root',
    template: template
  })
  class MockComponent {}
  @NgModule({
    imports: [ServerModule, BrowserModule.withServerTransition({appId: 'mock'})],
    declarations: [component || MockComponent],
    bootstrap: [component || MockComponent]
  })
  class MockServerModule {}
  return MockServerModule;
}

async function sendAndRecieve(renderOptions: SocketEngineRenderOptions, template = '') {
  return new Promise<SocketEngineResponse>(async(resolve, _reject) => {

    const appModule = makeTestingModule(template);
    const server = await startSocketEngine(appModule);

    const client = net.createConnection(9090, 'localhost', () => {
      client.write(JSON.stringify(renderOptions));
    });

    client.on('data', data => {
      const res = JSON.parse(data.toString()) as SocketEngineResponse;
      server.close();
      resolve(res);
    });
  });
}

describe('test runner', () => {
  it('should render a basic template', async (done) => {
    const template = `${new Date()}`;
    const renderOptions = {id: 1, url: '/path',
        document: '<root></root>'} as SocketEngineRenderOptions;
    const result = await sendAndRecieve(renderOptions, template);
    expect(result.html).toContain(template);
    done();
  });
  it('should return the same id', async(done) => {
    const id = Math.random();
    const renderOptions = {id , url: '/path',
        document: '<root></root>'} as SocketEngineRenderOptions;
    const result = await sendAndRecieve(renderOptions);
    expect(result.id).toEqual(id);
    done();
  });
  it('should return an error if it cant render', async(done) => {
    @Component({
      selector: 'root',
      template: ''
    })
    class MockComponent {constructor(_illMakeItThrow: '') {}}
    const appModule = makeTestingModule('', MockComponent);
    const server = await startSocketEngine(appModule);

    const client = net.createConnection(9090, 'localhost', () => {
      const renderOptions = {id: 1, url: '/path',
      document: '<root></root>'} as SocketEngineRenderOptions;
      client.write(JSON.stringify(renderOptions));
    });

    client.on('data', data => {
      const res = JSON.parse(data.toString()) as SocketEngineResponse;
      server.close();
      expect(res.error).not.toBeNull();
      done();
    });
  });
  it('should return an error if it cant render', async(done) => {
    const template = `${new Date()}`;
    const renderOptions = {id: 1, url: '/path',
        document: '<root></root>'} as SocketEngineRenderOptions;
    const result = await sendAndRecieve(renderOptions, template);
    expect(result.error).toBeUndefined();
    done();
  });
  it('should be able to inject some token', async(done) => {
    const SOME_TOKEN = new InjectionToken<string>('SOME_TOKEN');
    const someValue = {message: 'value' + new Date()};
    @Component({
      selector: 'root',
      template: `message:{{_someToken.message}}`
    })
    class MockComponent {constructor(@Inject(SOME_TOKEN) public readonly _someToken: any) {}}
    const appModule = makeTestingModule('', MockComponent);
    const server = await startSocketEngine(appModule, [{provide: SOME_TOKEN, useValue: someValue}]);

    const client = net.createConnection(9090, 'localhost', () => {
      const renderOptions = {id: 1, url: '/path',
      document: '<root></root>'} as SocketEngineRenderOptions;
      client.write(JSON.stringify(renderOptions));
    });

    client.on('data', data => {
      const res = JSON.parse(data.toString()) as SocketEngineResponse;
      server.close();
      expect(res.html).toContain(someValue.message);
      done();
    });
  });
});
