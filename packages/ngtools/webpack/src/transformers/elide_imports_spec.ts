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
import { createTypescriptContext, getLastNode, transformTypescript } from './ast_helpers';
import { RemoveNodeOperation } from './interfaces';
import { makeTransform } from './make_transform';

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
    };

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

    it('should only drop unused default imports when named and default', () => {
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

    it('should only drop unused named imports when named and default', () => {
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

    it('should only drop default imports when having named and default', () => {
      const input = tags.stripIndent`
        import promise, { fromPromise } from './const';
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

  });
});
