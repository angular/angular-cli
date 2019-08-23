/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { tags } from '@angular-devkit/core'; // tslint:disable-line:no-implicit-dependencies
import { createTypescriptContext, transformTypescript } from './ast_helpers';
import { downlevelConstructorParameters } from './ctor-parameters';

function transform(input: string, additionalFiles?: Record<string, string>) {
  const { program, compilerHost } = createTypescriptContext(input, additionalFiles);
  const transformer = downlevelConstructorParameters(() => program.getTypeChecker());
  const result = transformTypescript(undefined, [transformer], program, compilerHost);

  return result;
}

describe('Constructor Parameter Transformer', () => {
  it('records class name in same module', () => {
    const input = `
      export class ClassInject {};

      @Injectable()
      export class MyService {
        constructor(v: ClassInject) {}
      }
    `;

    const output = `
      import * as tslib_1 from "tslib";
      export class ClassInject { } ;
      let MyService = class MyService { constructor(v) { } };
      MyService.ctorParameters = () => [ { type: ClassInject } ];
      MyService = tslib_1.__decorate([ Injectable() ], MyService);
      export { MyService };
    `;

    const result = transform(input);

    expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
  });

  it('does not record when class does not have a decorator', () => {
    const input = `
      export class ClassInject {};

      export class MyService {
        constructor(v: ClassInject) {}
      }
    `;

    const output = `
      export class ClassInject { } ;
      export class MyService { constructor(v) { } }
    `;

    const result = transform(input);

    expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
  });

  it('records class name of root-provided injectable in same module', () => {
    const input = `
      @Injectable({
        providedIn: 'root'
      })
      export class RootProvidedService {

        constructor() { }
      }

      @Injectable()
      export class MyService {
        constructor(v: RootProvidedService) {}
      }
    `;

    const output = `
      import * as tslib_1 from "tslib";
      let RootProvidedService = class RootProvidedService { constructor() { } };
      RootProvidedService = tslib_1.__decorate([ Injectable({ providedIn: 'root' }) ], RootProvidedService);
      export { RootProvidedService };
      let MyService = class MyService { constructor(v) { } };
      MyService.ctorParameters = () => [ { type: RootProvidedService } ];
      MyService = tslib_1.__decorate([ Injectable() ], MyService);
      export { MyService };
    `;

    const result = transform(input);

    expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
  });

  // The current testing infrastructure does not support this test
  // Aliased TS symbols are resolved to 'unknown'
  xit('records class name of root-provided injectable in imported module', () => {
    const rootProvided = {
      'root-provided-service': `
        @Injectable({
          providedIn: 'root'
        })
        export class RootProvidedService {

          constructor() { }
        }
      `,
    };

    const input = `
      import { RootProvidedService } from './root-provided-service';

      @Injectable()
      export class MyService {
        constructor(v: RootProvidedService) {}
      }
    `;

    const output = `export class MyService { constructor(v) { } } MyService.ctorParameters = () => [ { type: RootProvidedService } ];`;

    const result = transform(input, rootProvided);

    expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
  });

  it('does not record exported interface name in same module with Inject decorators', () => {
    const input = `
      export interface InterInject {}
      export const INTERFACE_INJECT = new InjectionToken<InterInject>('interface-inject');

      @Injectable()
      export class MyService {
        constructor(@Inject(INTERFACE_INJECT) v: InterInject) {}
      }
    `;

    const output = `
      import * as tslib_1 from "tslib";
      export const INTERFACE_INJECT = new InjectionToken('interface-inject');
      let MyService = class MyService { constructor(v) { } };
      MyService.ctorParameters = () => [ { type: undefined, decorators: [{ type: Inject, args: [INTERFACE_INJECT,] }] } ];
      MyService = tslib_1.__decorate([ Injectable(), tslib_1.__param(0, Inject(INTERFACE_INJECT)) ], MyService);
      export { MyService };
    `;

    const result = transform(input);

    expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
  });

  it('does not record interface name in same module with Inject decorators', () => {
    const input = `
      interface InterInject {}
      export const INTERFACE_INJECT = new InjectionToken<InterInject>('interface-inject');

      @Injectable()
      export class MyService {
        constructor(@Inject(INTERFACE_INJECT) v: InterInject) {}
      }
    `;

    const output = `
      import * as tslib_1 from "tslib";
      export const INTERFACE_INJECT = new InjectionToken('interface-inject');
      let MyService = class MyService { constructor(v) { } };
      MyService.ctorParameters = () => [ { type: undefined, decorators: [{ type: Inject, args: [INTERFACE_INJECT,] }] } ];
      MyService = tslib_1.__decorate([ Injectable(), tslib_1.__param(0, Inject(INTERFACE_INJECT)) ], MyService);
      export { MyService };
    `;

    const result = transform(input);

    expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
  });

  it('does not record interface name in imported module with Inject decorators', () => {
    const injectedModule = {
      'module-inject': `
        export interface InterInject {};
        export const INTERFACE_INJECT = new InjectionToken<InterInject>('interface-inject');
      `,
    };

    const input = `
      import { INTERFACE_INJECT, InterInject } from './module-inject';

      @Injectable()
      export class MyService {
        constructor(@Inject(INTERFACE_INJECT) v: InterInject) {}
      }
    `;

    const output = `
      import * as tslib_1 from "tslib";
      import { INTERFACE_INJECT } from './module-inject';
      let MyService = class MyService { constructor(v) { } };
      MyService.ctorParameters = () => [ { type: undefined, decorators: [{ type: Inject, args: [INTERFACE_INJECT,] }] } ];
      MyService = tslib_1.__decorate([ Injectable(), tslib_1.__param(0, Inject(INTERFACE_INJECT)) ], MyService);
      export { MyService };
    `;

    const result = transform(input, injectedModule);

    expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
  });
});
