import { ngExpressEngine } from '@nguniversal/express-engine';
import { CompilerFactory, Compiler,
   Component, Inject, InjectionToken } from '@angular/core';
import { platformDynamicServer } from '@angular/platform-server';
import { ServerModule } from '@angular/platform-server';
import { NgModule } from '@angular/core';
import { ResourceLoader } from '@angular/compiler';
import { FileLoader } from '../src/file-loader';
import 'zone.js';

import { BrowserModule } from '@angular/platform-browser';
import { REQUEST } from '@nguniversal/express-engine/tokens';

export function getCompiler(): Compiler {
  const compilerFactory = platformDynamicServer().injector.get(CompilerFactory) as CompilerFactory;
  return compilerFactory.createCompiler([{
    providers: [{provide: ResourceLoader, useClass: FileLoader}]
  }]);
}

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

// tslint:disable
xdescribe('test runner', () => {
  it('should render a basic template', (done) => {
    const template = `some template: ${new Date()}`;
    const appModule = makeTestingModule(template);
    ngExpressEngine({bootstrap: appModule})(null as any as string, {
      req: {} as any,
      // TODO this shouldn't be required
      bootstrap: appModule,
      document: '<root></root>'
    }, (err, html) => {
      if (err) {
        throw err;
      }
      expect(html).toContain(template);
      done();
    });
  });

  it('Should throw when no module is passed', () => {
    ngExpressEngine({bootstrap: null as any})(null as any as string, {
      req: {} as any,
      bootstrap: null as any,
      document: '<root></root>'
    }, (_err, _html) => {
      expect(_err).toBeTruthy();
     });
  });

  it('should be able to inject REQUEST token', (done) => {
    @Component({
      selector: 'root',
      template: `url:{{_req.url}}`
    })
    class RequestComponent {
      constructor(@Inject(REQUEST) public readonly _req: any) { }
    }
    const appModule = makeTestingModule('', RequestComponent);
    ngExpressEngine({bootstrap: appModule})(null as any as string, {
      req: {url: 'http://localhost:4200'} as any,
      // TODO this shouldn't be required
      bootstrap: appModule,
      document: '<root></root>'
    }, (err, html) => {
      if (err) {
        throw err;
      }
      expect(html).toContain('url:http://localhost:4200');
      done();
    });
  });

  it('should be able to inject REQUEST token', (done) => {
    const SOME_TOKEN = new InjectionToken<string>('SOME_TOKEN');
    const someValue = {message: 'value' + new Date()};
    @Component({
      selector: 'root',
      template: `message:{{_someToken.message}}`
    })
    class RequestComponent {
      constructor(@Inject(SOME_TOKEN) public readonly _someToken: any) { }
    }
    const appModule = makeTestingModule('', RequestComponent);
    ngExpressEngine({bootstrap: appModule, providers: [
      {provide: SOME_TOKEN, useValue: someValue}
    ]})(null as any as string, {
      req: {url: 'http://localhost:4200'} as any,
      // TODO this shouldn't be required
      bootstrap: appModule,
      document: '<root></root>'
    }, (err, html) => {
      if (err) {
        throw err;
      }
      expect(html).toContain(someValue.message);
      done();
    });
  });
});
