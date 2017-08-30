import {removeModuleIdOnlyForTesting} from './loader';
import {WebpackCompilerHost} from './compiler_host';
import {TypeScriptFileRefactor} from './refactor';
import {ProgramManager} from './program_manager';

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

        const programManager = new ProgramManager(['/file.ts', '/file2.ts'], {}, host);

        const refactor = new TypeScriptFileRefactor('/file.ts', host, programManager);
        removeModuleIdOnlyForTesting(refactor);

        const outputText = refactor.transpile().outputText;
        expect(outputText).not.toMatch(/obj = \{\s+};/);
        expect(outputText).not.toMatch(/\{\s*otherValue: 1\s*};/);

        const refactor2 = new TypeScriptFileRefactor('/file2.ts', host, programManager);
        removeModuleIdOnlyForTesting(refactor2);
        const outputText2 = refactor2.transpile().outputText;
        expect(outputText2).toMatch(/\(\{\s*}\)/);
        expect(outputText2).toMatch(/\(\{\s*otherValue1: 1\s*}\)/);
        expect(outputText2).toMatch(/\(\{\s*otherValue2: 2\s*,\s*otherValue3: 3\s*}\)/);
        expect(outputText2).toMatch(/\(\{\s*otherValue4: 4\s*}\)/);
      });

      it('should work without a root name', () => {
        const host = new WebpackCompilerHost({}, '');
        host.writeFile('/file.ts', `
          import './file2';
        `, false);
        host.writeFile('/file2.ts', `
          @SomeDecorator({ moduleId: 123 }) class CLS {}
          @SomeDecorator({ moduleId: 123, otherValue1: 1 }) class CLS2 {}
          @SomeDecorator({ otherValue2: 2, moduleId: 123, otherValue3: 3 }) class CLS3 {}
          @SomeDecorator({ otherValue4: 4, moduleId: 123 }) class CLS4 {}
        `, false);

        const programManager = new ProgramManager(['/file.ts'], {}, host);
        const refactor = new TypeScriptFileRefactor('/file2.ts', host, programManager);
        removeModuleIdOnlyForTesting(refactor);
        const outputText = refactor.transpile().outputText;
        expect(outputText).toMatch(/\(\{\s*}\)/);
        expect(outputText).toMatch(/\(\{\s*otherValue1: 1\s*}\)/);
        expect(outputText).toMatch(/\(\{\s*otherValue2: 2\s*,\s*otherValue3: 3\s*}\)/);
        expect(outputText).toMatch(/\(\{\s*otherValue4: 4\s*}\)/);
      });
    });
  });
});
