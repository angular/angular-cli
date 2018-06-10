import {Component, destroyPlatform, getPlatform, NgModule} from '@angular/core';
import {ServerModule} from '@angular/platform-server';
import {ngHapiEngine} from '@nguniversal/hapi-engine';
import {ServerInjectResponse, Request, Server} from 'hapi';
import 'zone.js';
import {BrowserModule} from '@angular/platform-browser';

@Component({selector: 'app', template: `Works!`})
class MyServerApp {
}


@NgModule({
  bootstrap: [MyServerApp],
  declarations: [MyServerApp],
  imports: [ServerModule, BrowserModule.withServerTransition({appId: 'hapi-test'})],
})
class ExampleModule {
}


describe('test runner', () => {

  const server = new Server({ debug: false });
  server.route([
    {
      method: 'GET',
      path: '/',
      handler: (req: Request) => ngHapiEngine({
        bootstrap: ExampleModule,
        req,
        document: '<html><body><app></app></body></html>'
      })
    },
    {
      method: 'GET',
      path: '/test',
      handler: () => 'ok'
    },
  ]);

  beforeEach(async () => {
    if (getPlatform()) {
      destroyPlatform();
    }
  });

  it('should test the server', async () => {
    const request = {
      method: 'GET',
      url: '/test'
    };

    const res = await server.inject(request);
    expect(res.result).toBeDefined();
    expect(res.result).toBe('ok' as any);
  });

  it('Returns a reply on successful request', async () => {
    const request = {
      method: 'GET',
      url: '/'
    };

    const res: ServerInjectResponse = await server.inject(request);
    expect(res.result).toBeDefined();
    expect(res.result).toContain('Works!');
  });
});
