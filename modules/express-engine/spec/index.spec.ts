import 'zone.js';

import { ngExpressEngine } from '@nguniversal/express-engine';

import { SOME_TOKEN } from '../testing/mock.server.module';
import {
  MockServerModuleNgFactory,
  RequestServerModuleNgFactory,
  ResponseServerModuleNgFactory,
  TokenServerModuleNgFactory,
} from '../testing/mock.server.module.ngfactory';

describe('test runner', () => {
  it('should render a basic template', (done) => {
    ngExpressEngine({ bootstrap: MockServerModuleNgFactory })(
      (null as any) as string,
      {
        req: { get: () => 'localhost' } as any,
        // TODO this shouldn't be required
        bootstrap: MockServerModuleNgFactory,
        document: '<root></root>',
      },
      (err, html) => {
        if (err) {
          throw err;
        }
        expect(html).toContain('some template');
        done();
      },
    );
  });

  it('Should throw when no module is passed', () => {
    ngExpressEngine({ bootstrap: null as any })(
      (null as any) as string,
      {
        req: {} as any,
        bootstrap: null as any,
        document: '<root></root>',
      },
      (_err, _html) => {
        expect(_err).toBeTruthy();
      },
    );
  });

  it('should be able to inject REQUEST token', (done) => {
    ngExpressEngine({ bootstrap: RequestServerModuleNgFactory })(
      (null as any) as string,
      {
        req: {
          get: () => 'localhost',
          url: 'http://localhost:4200',
        } as any,
        // TODO this shouldn't be required
        bootstrap: RequestServerModuleNgFactory,
        document: '<root></root>',
      },
      (err, html) => {
        if (err) {
          throw err;
        }
        expect(html).toContain('url:http://localhost:4200');
        done();
      },
    );
  });

  it('should be able to inject RESPONSE token', (done) => {
    const someStatusCode = 400;
    ngExpressEngine({ bootstrap: ResponseServerModuleNgFactory })(
      (null as any) as string,
      {
        req: {
          get: () => 'localhost',
          res: {
            statusCode: someStatusCode,
          },
        } as any,
        // TODO this shouldn't be required
        bootstrap: ResponseServerModuleNgFactory,
        document: '<root></root>',
      },
      (err, html) => {
        if (err) {
          throw err;
        }
        expect(html).toContain(`statusCode:${someStatusCode}`);
        done();
      },
    );
  });

  it('should be able to inject some token', (done) => {
    const someValue = { message: 'value' + new Date() };
    ngExpressEngine({
      bootstrap: TokenServerModuleNgFactory,
      providers: [{ provide: SOME_TOKEN, useValue: someValue }],
    })(
      (null as any) as string,
      {
        req: {
          get: () => 'localhost',
          url: 'http://localhost:4200',
        } as any,
        // TODO this shouldn't be required
        bootstrap: TokenServerModuleNgFactory,
        document: '<root></root>',
      },
      (err, html) => {
        if (err) {
          throw err;
        }
        expect(html).toContain(someValue.message);
        done();
      },
    );
  });
});
