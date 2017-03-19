import * as ts from 'typescript';
import {removeModuleIdOnlyForTesting} from './loader';
import {WebpackCompilerHost} from './compiler_host';
import {TypeScriptFileRefactor} from './refactor';

describe('@ngtools/webpack', () => {
  describe('loader', () => {
    describe('removeModuleId', () => {
      it('should work', () => {
        const host = new WebpackCompilerHost({}, '');
        host.writeFile('/file.ts', `
          export const obj = { moduleId: 123 };
          export const obj2 = { moduleId: 123, otherValue: 1 };
          export const obj3 = { otherValue: 1, moduleId: 123 };
        `, false);
        host.writeFile('/file2.ts', `
          @SomeDecorator({ moduleId: 123 }) class CLS {}
          @SomeDecorator({ moduleId: 123, otherValue1: 1 }) class CLS2 {}
          @SomeDecorator({ otherValue2: 2, moduleId: 123, otherValue3: 3 }) class CLS3 {}
          @SomeDecorator({ otherValue4: 4, moduleId: 123 }) class CLS4 {}
        `, false);

        const program = ts.createProgram(['/file.ts', '/file2.ts'], {}, host);

        const refactor = new TypeScriptFileRefactor('/file.ts', host, program);
        removeModuleIdOnlyForTesting(refactor);
        expect(refactor.sourceText).not.toMatch(/obj = \{\s+};/);
        expect(refactor.sourceText).not.toMatch(/\{\s*otherValue: 1\s*};/);

        const refactor2 = new TypeScriptFileRefactor('/file2.ts', host, program);
        removeModuleIdOnlyForTesting(refactor2);
        expect(refactor2.sourceText).toMatch(/\(\{\s+}\)/);
        expect(refactor2.sourceText).toMatch(/\(\{\s*otherValue1: 1\s*}\)/);
        expect(refactor2.sourceText).toMatch(/\(\{\s*otherValue2: 2\s*,\s*otherValue3: 3\s*}\)/);
        expect(refactor2.sourceText).toMatch(/\(\{\s*otherValue4: 4\s*}\)/);
      });

      it('should work without a root name', () => {
        const host = new WebpackCompilerHost({}, '');
        host.writeFile('/file.ts', `
          import './file2.ts';
        `, false);
        host.writeFile('/file2.ts', `
          @SomeDecorator({ moduleId: 123 }) class CLS {}
          @SomeDecorator({ moduleId: 123, otherValue1: 1 }) class CLS2 {}
          @SomeDecorator({ otherValue2: 2, moduleId: 123, otherValue3: 3 }) class CLS3 {}
          @SomeDecorator({ otherValue4: 4, moduleId: 123 }) class CLS4 {}
        `, false);

        const program = ts.createProgram(['/file.ts'], {}, host);
        const refactor = new TypeScriptFileRefactor('/file2.ts', host, program);
        removeModuleIdOnlyForTesting(refactor);
        expect(refactor.sourceText).toMatch(/\(\{\s+}\)/);
        expect(refactor.sourceText).toMatch(/\(\{\s*otherValue1: 1\s*}\)/);
        expect(refactor.sourceText).toMatch(/\(\{\s*otherValue2: 2\s*,\s*otherValue3: 3\s*}\)/);
        expect(refactor.sourceText).toMatch(/\(\{\s*otherValue4: 4\s*}\)/);
      });
    });
  });
});
