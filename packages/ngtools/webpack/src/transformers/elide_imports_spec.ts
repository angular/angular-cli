/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/* eslint-disable max-len */
import { tags } from '@angular-devkit/core';
import * as ts from 'typescript';
import { elideImports } from './elide_imports';
import { createTypescriptContext, transformTypescript } from './spec_helpers';

describe('@ngtools/webpack transformers', () => {
  describe('elide_imports', () => {
    const dummyNode = `const remove = ''`;

    // Transformer that removes the last node and then elides unused imports
    const transformer = (program: ts.Program) => {
      return (context: ts.TransformationContext) => {
        return (sourceFile: ts.SourceFile) => {
          const lastNode = sourceFile.statements[sourceFile.statements.length - 1];
          const updatedSourceFile = context.factory.updateSourceFile(
            sourceFile,
            ts.setTextRange(
              context.factory.createNodeArray(sourceFile.statements.slice(0, -1)),
              sourceFile.statements,
            ),
          );

          const importRemovals = elideImports(
            updatedSourceFile,
            [lastNode],
            () => program.getTypeChecker(),
            context.getCompilerOptions(),
          );
          if (importRemovals.size > 0) {
            return ts.visitEachChild(
              updatedSourceFile,
              function visitForRemoval(node): ts.Node | undefined {
                return importRemovals.has(node)
                  ? undefined
                  : ts.visitEachChild(node, visitForRemoval, context);
              },
              context,
            );
          }

          return updatedSourceFile;
        };
      };
    };

    const additionalFiles: Record<string, string> = {
      'const.ts': `
        export const animations = [];
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
      'type.ts': `
        export interface OnChanges {
          ngOnChanges(changes: SimpleChanges): void;
        }

        export interface SimpleChanges {
          [propName: string]: unknown;
        }
      `,
      'jsx.ts': `
        export function createElement() {}
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

      expect(tags.oneLine`${result}`).toEqual('export {};');
    });

    it('should remove unused aliased imports', () => {
      const input = tags.stripIndent`
        import { promise as fromPromise } from './const';
        const unused = fromPromise;
      `;

      const { program, compilerHost } = createTypescriptContext(input, additionalFiles);
      const result = transformTypescript(undefined, [transformer(program)], program, compilerHost);

      expect(tags.oneLine`${result}`).toEqual('export {};');
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

      expect(tags.oneLine`${result}`).toEqual('export {};');
    });

    it('should drop unused imports in export specifier', () => {
      const input = tags.stripIndent`
        import { promise as fromPromise } from './const';
        export { fromPromise };
      `;

      const { program, compilerHost } = createTypescriptContext(input, additionalFiles);
      const result = transformTypescript(undefined, [transformer(program)], program, compilerHost);

      expect(tags.oneLine`${result}`).toEqual('export {};');
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

      expect(tags.oneLine`${result}`).toEqual('export {};');
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

      expect(tags.oneLine`${result}`).toEqual('export {};');
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

        const { program, compilerHost } = createTypescriptContext(
          input,
          additionalFiles,
          true,
          extraCompilerOptions,
        );
        const result = transformTypescript(
          undefined,
          [transformer(program)],
          program,
          compilerHost,
        );

        expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
      });
    });

    it('keeps jsxFactory imports when configured', () => {
      const extraCompilerOptions: ts.CompilerOptions = {
        jsxFactory: 'createElement',
        experimentalDecorators: true,
        jsx: ts.JsxEmit.React,
      };

      const input = tags.stripIndent`
        import { Decorator } from './decorator';
        import { Service } from './service';
        import { createElement } from './jsx';

        const test = <p>123</p>;

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
        import { createElement } from './jsx';

        const test = createElement("p", null, "123");

        let Foo = class Foo { constructor(param) { } };
        Foo = __decorate([ Decorator() ], Foo);
        export { Foo };
      `;

      const { program, compilerHost } = createTypescriptContext(
        input,
        additionalFiles,
        true,
        extraCompilerOptions,
        true,
      );
      const result = transformTypescript(undefined, [transformer(program)], program, compilerHost);

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
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

        const { program, compilerHost } = createTypescriptContext(
          input,
          additionalFiles,
          true,
          extraCompilerOptions,
        );
        const result = transformTypescript(
          undefined,
          [transformer(program)],
          program,
          compilerHost,
        );

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

        const { program, compilerHost } = createTypescriptContext(
          input,
          additionalFiles,
          true,
          extraCompilerOptions,
        );
        const result = transformTypescript(
          undefined,
          [transformer(program)],
          program,
          compilerHost,
        );

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

        const { program, compilerHost } = createTypescriptContext(
          input,
          additionalFiles,
          true,
          extraCompilerOptions,
        );
        const result = transformTypescript(
          undefined,
          [transformer(program)],
          program,
          compilerHost,
        );

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

        const { program, compilerHost } = createTypescriptContext(
          input,
          additionalFiles,
          true,
          extraCompilerOptions,
        );
        const result = transformTypescript(
          undefined,
          [transformer(program)],
          program,
          compilerHost,
        );

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

        const { program, compilerHost } = createTypescriptContext(
          input,
          additionalFiles,
          true,
          extraCompilerOptions,
        );
        const result = transformTypescript(
          undefined,
          [transformer(program)],
          program,
          compilerHost,
        );

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

        const { program, compilerHost } = createTypescriptContext(
          input,
          additionalFiles,
          true,
          extraCompilerOptions,
        );
        const result = transformTypescript(
          undefined,
          [transformer(program)],
          program,
          compilerHost,
        );

        expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
      });

      it('should remove type-only imports', () => {
        const input = tags.stripIndent`
          import { Decorator } from './decorator';
          import { Service } from './service';
          import type { OnChanges, SimpleChanges } from './type';

          @Decorator()
          class Foo implements OnChanges {
            constructor(param: Service) { }
            ngOnChanges(changes: SimpleChanges) { }
          }

          ${dummyNode}
        `;

        const output = tags.stripIndent`
          import { __decorate, __metadata } from "tslib";
          import { Decorator } from './decorator';
          import { Service } from './service';

          let Foo = class Foo {
            constructor(param) { }
            ngOnChanges(changes) { }
          };

          Foo = __decorate([ Decorator(), __metadata("design:paramtypes", [Service]) ], Foo);
        `;

        const { program, compilerHost } = createTypescriptContext(
          input,
          additionalFiles,
          true,
          extraCompilerOptions,
        );
        const result = transformTypescript(
          undefined,
          [transformer(program)],
          program,
          compilerHost,
        );

        expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
      });

      describe('NGTSC - ShorthandPropertyAssignment to PropertyAssignment', () => {
        const transformShorthandPropertyAssignment = (
          context: ts.TransformationContext,
        ): ts.Transformer<ts.SourceFile> => {
          const visit: ts.Visitor = (node) => {
            if (ts.isShorthandPropertyAssignment(node)) {
              return ts.createPropertyAssignment(node.name, node.name);
            }

            return ts.visitEachChild(node, (child) => visit(child), context);
          };

          return (node) => ts.visitNode(node, visit);
        };

        it('should not elide import when ShorthandPropertyAssignment is transformed to PropertyAssignment', () => {
          const input = tags.stripIndent`
            import { animations } from './const';
            const used = {
              animations
            }

            ${dummyNode}
          `;

          const output = tags.stripIndent`
            import { animations } from './const';
            const used = { animations: animations };
          `;

          const { program, compilerHost } = createTypescriptContext(input, additionalFiles);
          const result = transformTypescript(
            undefined,
            [transformShorthandPropertyAssignment, transformer(program)],
            program,
            compilerHost,
          );

          expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
        });
      });
    });
  });
});
