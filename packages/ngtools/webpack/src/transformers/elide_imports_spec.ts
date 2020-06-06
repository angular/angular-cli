/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-big-function
import { tags } from '@angular-devkit/core';  // tslint:disable-line:no-implicit-dependencies
import * as ts from 'typescript';
import { getLastNode } from './ast_helpers';
import { RemoveNodeOperation } from './interfaces';
import { makeTransform } from './make_transform';
import { createTypescriptContext, transformTypescript } from './spec_helpers';

describe('@ngtools/webpack transformers', () => {
  describe('elide_imports', () => {

    const dummyNode = `const remove = ''`;

    const transformer = (program: ts.Program) => (
      makeTransform(
        (sourceFile: ts.SourceFile) =>
          [new RemoveNodeOperation(sourceFile, getLastNode(sourceFile) as ts.Node)],
        () => program.getTypeChecker(),
      )
    );

    const additionalFiles: Record<string, string> = {
      'const.ts': `
        export const promise = () => null;
        export const take = () => null;
        export default promise;
      `,
      'decorator.ts': `
        export function Decorator(value?: any): any {
          return function (): any { };
        }
      `,
      'service.ts': `
        export class Service { }
      `,
    };

    it('should remove unused imports', () => {
      const input = tags.stripIndent`
        import { promise } from './const';
        import { take } from './const';
        const unused = promise;
      `;

      const { program, compilerHost } = createTypescriptContext(input, additionalFiles);
      const result = transformTypescript(undefined, [transformer(program)], program, compilerHost);

      expect(tags.oneLine`${result}`).toEqual('');
    });

    it('should remove unused aliased imports', () => {
      const input = tags.stripIndent`
        import { promise as fromPromise } from './const';
        const unused = fromPromise;
      `;

      const { program, compilerHost } = createTypescriptContext(input, additionalFiles);
      const result = transformTypescript(undefined, [transformer(program)], program, compilerHost);

      expect(tags.oneLine`${result}`).toEqual('');
    });

    it('should retain used aliased imports', () => {
      const input = tags.stripIndent`
        import { promise as fromPromise } from './const';
        const used = fromPromise;

        ${dummyNode}
      `;

      const output = tags.stripIndent`
        import { promise as fromPromise } from './const';
        const used = fromPromise;
      `;

      const { program, compilerHost } = createTypescriptContext(input, additionalFiles);
      const result = transformTypescript(undefined, [transformer(program)], program, compilerHost);

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should retain used namespaced imports', () => {
      const input = tags.stripIndent`
        import * as namespaced from './const';
        const used = namespaced;

        ${dummyNode}
      `;

      const output = tags.stripIndent`
        import * as namespaced from './const';
        const used = namespaced;
      `;

      const { program, compilerHost } = createTypescriptContext(input, additionalFiles);
      const result = transformTypescript(undefined, [transformer(program)], program, compilerHost);

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should drop unused namespaced imports', () => {
      const input = tags.stripIndent`
        import * as namespaced from './const';
        const used = namespaced;
      `;

      const { program, compilerHost } = createTypescriptContext(input, additionalFiles);
      const result = transformTypescript(undefined, [transformer(program)], program, compilerHost);

      expect(tags.oneLine`${result}`).toEqual('');
    });

    it('should drop unused imports in export specifier', () => {
      const input = tags.stripIndent`
        import { promise as fromPromise } from './const';
        export { fromPromise };
      `;

      const { program, compilerHost } = createTypescriptContext(input, additionalFiles);
      const result = transformTypescript(undefined, [transformer(program)], program, compilerHost);

      expect(tags.oneLine`${result}`).toEqual('');
    });

    it('should retain used imports in export specifier', () => {
      const input = tags.stripIndent`
        import { promise as fromPromise } from './const';
        export { fromPromise };

        ${dummyNode}
      `;

      const output = tags.stripIndent`
        import { promise as fromPromise } from './const';
        export { fromPromise };
      `;

      const { program, compilerHost } = createTypescriptContext(input, additionalFiles);
      const result = transformTypescript(undefined, [transformer(program)], program, compilerHost);

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should drop unused in shorthand property assignment', () => {
      const input = tags.stripIndent`
        import { promise as fromPromise } from './const';
        const unused = { fromPromise };
      `;

      const { program, compilerHost } = createTypescriptContext(input, additionalFiles);
      const result = transformTypescript(undefined, [transformer(program)], program, compilerHost);

      expect(tags.oneLine`${result}`).toEqual('');
    });

    it('should retain used imports in shorthand property assignment', () => {
      const input = tags.stripIndent`
        import { promise as fromPromise } from './const';
        const used = { fromPromise };

        ${dummyNode}
      `;

      const output = tags.stripIndent`
        import { promise as fromPromise } from './const';
        const used = { fromPromise };
      `;

      const { program, compilerHost } = createTypescriptContext(input, additionalFiles);
      const result = transformTypescript(undefined, [transformer(program)], program, compilerHost);

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should drop unused default import', () => {
      const input = tags.stripIndent`
        import defaultPromise from './const';
        const unused = defaultPromise;
      `;

      const { program, compilerHost } = createTypescriptContext(input, additionalFiles);
      const result = transformTypescript(undefined, [transformer(program)], program, compilerHost);

      expect(tags.oneLine`${result}`).toEqual('');
    });

    it('should retain used default import', () => {
      const input = tags.stripIndent`
        import defaultPromise from './const';
        const used = defaultPromise;

        ${dummyNode}
      `;

      const output = tags.stripIndent`
        import defaultPromise from './const';
        const used = defaultPromise;
      `;

      const { program, compilerHost } = createTypescriptContext(input, additionalFiles);
      const result = transformTypescript(undefined, [transformer(program)], program, compilerHost);

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should only drop unused default imports when named and default (1)', () => {
      const input = tags.stripIndent`
        import promise, { promise as fromPromise } from './const';
        const used = fromPromise;
        const unused = promise;
      `;

      const output = tags.stripIndent`
        import { promise as fromPromise } from './const';
        const used = fromPromise;
      `;

      const { program, compilerHost } = createTypescriptContext(input, additionalFiles);
      const result = transformTypescript(undefined, [transformer(program)], program, compilerHost);

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should only drop unused named imports when named and default (2)', () => {
      const input = tags.stripIndent`
        import promise, { promise as fromPromise, take } from './const';
        const used = fromPromise;
        const unused = promise;
      `;

      const output = tags.stripIndent`
        import { promise as fromPromise } from './const';
        const used = fromPromise;
      `;

      const { program, compilerHost } = createTypescriptContext(input, additionalFiles);
      const result = transformTypescript(undefined, [transformer(program)], program, compilerHost);

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should only drop default imports when having named and default (3)', () => {
      const input = tags.stripIndent`
        import promise, { promise as fromPromise } from './const';
        const used = promise;
        const unused = fromPromise;
      `;

      const output = tags.stripIndent`
        import promise from './const';
        const used = promise;
      `;

      const { program, compilerHost } = createTypescriptContext(input, additionalFiles);
      const result = transformTypescript(undefined, [transformer(program)], program, compilerHost);

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should retain import clause', () => {
      const input = tags.stripIndent`
        import './const';

        ${dummyNode}
      `;

      const output = tags.stripIndent`
        import './const';
      `;

      const { program, compilerHost } = createTypescriptContext(input, additionalFiles);
      const result = transformTypescript(undefined, [transformer(program)], program, compilerHost);

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it(`should remove import for 'ExpressionWithTypeArguments' implements token`, () => {
      const input = tags.stripIndent`
        import { Bar, Buz, Unused } from './bar';

        export class Foo extends Bar implements Buz { }

        ${dummyNode}
      `;

      const output = tags.stripIndent`
        import { Bar } from './bar';

        export class Foo extends Bar { }
      `;

      const { program, compilerHost } = createTypescriptContext(input);
      const result = transformTypescript(undefined, [transformer(program)], program, compilerHost);

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    describe('should elide imports decorator type references when emitDecoratorMetadata is false', () => {
      const extraCompilerOptions: ts.CompilerOptions = {
        emitDecoratorMetadata: false,
        experimentalDecorators: true,
      };

      it('should remove ctor parameter type reference', () => {
        const input = tags.stripIndent`
          import { Decorator } from './decorator';
          import { Service } from './service';

          @Decorator()
          export class Foo {
            constructor(param: Service) {
            }
          }

          ${dummyNode}
        `;

        const output = tags.stripIndent`
          import { __decorate } from "tslib";
          import { Decorator } from './decorator';

          let Foo = class Foo { constructor(param) { } };
          Foo = __decorate([ Decorator() ], Foo);
          export { Foo };
        `;

        const { program, compilerHost } = createTypescriptContext(input, additionalFiles, true, extraCompilerOptions);
        const result = transformTypescript(undefined, [transformer(program)], program, compilerHost);

        expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
      });
    });

    describe('should not elide imports decorator type references when emitDecoratorMetadata is true', () => {
      const extraCompilerOptions: ts.CompilerOptions = {
         emitDecoratorMetadata: true,
         experimentalDecorators: true,
      };

      it('should not remove ctor parameter type reference', () => {
        const input = tags.stripIndent`
          import { Decorator } from './decorator';
          import { Service } from './service';

          @Decorator()
          export class Foo {
            constructor(param: Service) {
            }
          }

          ${dummyNode}
        `;

        const output = tags.stripIndent`
          import { __decorate, __metadata } from "tslib";
          import { Decorator } from './decorator';
          import { Service } from './service';

          let Foo = class Foo { constructor(param) { } };
          Foo = __decorate([ Decorator(), __metadata("design:paramtypes", [Service]) ], Foo);
          export { Foo };
        `;

        const { program, compilerHost } = createTypescriptContext(input, additionalFiles, true, extraCompilerOptions);
        const result = transformTypescript(undefined, [transformer(program)], program, compilerHost);

        expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
      });

      it('should not remove property declaration parameter type reference', () => {
        const input = tags.stripIndent`
          import { Decorator } from './decorator';
          import { Service } from './service';

          export class Foo {
            @Decorator() foo: Service;
          }

          ${dummyNode}
        `;

        const output = tags.stripIndent`
          import { __decorate, __metadata } from "tslib";
          import { Decorator } from './decorator';

          import { Service } from './service';

          export class Foo { }
          __decorate([ Decorator(), __metadata("design:type", Service) ], Foo.prototype, "foo", void 0);
        `;

        const { program, compilerHost } = createTypescriptContext(input, additionalFiles, true, extraCompilerOptions);
        const result = transformTypescript(undefined, [transformer(program)], program, compilerHost);

        expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
      });

      it('should not remove set accessor parameter type reference', () => {
        const input = tags.stripIndent`
          import { Decorator } from './decorator';
          import { Service } from './service';

          export class Foo {
            _foo: Service;

            @Decorator()
            set name(f: Service) {
                this._foo = f;
            }
          }

          ${dummyNode}
        `;

        const output = tags.stripIndent`
          import { __decorate, __metadata } from "tslib";
          import { Decorator } from './decorator';
          import { Service } from './service';

          export class Foo { set name(f) { this._foo = f; } }
          __decorate([ Decorator(), __metadata("design:type", Service), __metadata("design:paramtypes", [Service]) ], Foo.prototype, "name", null);
        `;

        const { program, compilerHost } = createTypescriptContext(input, additionalFiles, true, extraCompilerOptions);
        const result = transformTypescript(undefined, [transformer(program)], program, compilerHost);

        expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
      });

      it('should not remove get accessor parameter type reference', () => {
        const input = tags.stripIndent`
          import { Decorator } from './decorator';
          import { Service } from './service';

          export class Foo {
            _foo: Service;

            @Decorator()
            get name(): Service {
              return this._foo;
            }
          }

          ${dummyNode}
        `;

        const output = tags.stripIndent`
          import { __decorate, __metadata } from "tslib";
          import { Decorator } from './decorator';
          import { Service } from './service';

          export class Foo { get name() { return this._foo; } }
         __decorate([ Decorator(), __metadata("design:type", Service), __metadata("design:paramtypes", []) ], Foo.prototype, "name", null);
        `;

        const { program, compilerHost } = createTypescriptContext(input, additionalFiles, true, extraCompilerOptions);
        const result = transformTypescript(undefined, [transformer(program)], program, compilerHost);

        expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
      });

      it('should not remove decorated method return type reference', () => {
        const input = tags.stripIndent`
          import { Decorator } from './decorator';
          import { Service } from './service';

          export class Foo {
            @Decorator()
            name(): Service {
              return undefined;
            }
          }

          ${dummyNode}
        `;

        const output = tags.stripIndent`
          import { __decorate, __metadata } from "tslib";
          import { Decorator } from './decorator';
          import { Service } from './service';

          export class Foo { name() { return undefined; } }
          __decorate([ Decorator(), __metadata("design:type", Function),
          __metadata("design:paramtypes", []), __metadata("design:returntype", Service) ], Foo.prototype, "name", null);
        `;

        const { program, compilerHost } = createTypescriptContext(input, additionalFiles, true, extraCompilerOptions);
        const result = transformTypescript(undefined, [transformer(program)], program, compilerHost);

        expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
      });

      it('should not remove decorated method parameter type reference', () => {
        const input = tags.stripIndent`
          import { Decorator } from './decorator';
          import { Service } from './service';

          export class Foo {
            @Decorator()
            name(f: Service) {
            }
          }

          ${dummyNode}
        `;

        const output = tags.stripIndent`
          import { __decorate, __metadata } from "tslib";

          import { Decorator } from './decorator';
          import { Service } from './service';

          export class Foo { name(f) { } }

          __decorate([ Decorator(), __metadata("design:type", Function), __metadata("design:paramtypes", [Service]),
          __metadata("design:returntype", void 0) ], Foo.prototype, "name", null);
        `;

        const { program, compilerHost } = createTypescriptContext(input, additionalFiles, true, extraCompilerOptions);
        const result = transformTypescript(undefined, [transformer(program)], program, compilerHost);

        expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
      });
    });
  });
});
