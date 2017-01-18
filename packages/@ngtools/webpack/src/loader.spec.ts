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
          export const obj2 = { otherValue: 1, moduleId: 123 };
        `, false);

        const program = ts.createProgram(['/file.ts'], {}, host);

        const refactor = new TypeScriptFileRefactor('/file.ts', host, program);
        removeModuleIdOnlyForTesting(refactor);

        expect(refactor.sourceText).toMatch(/obj = \{\s+};/);
        expect(refactor.sourceText).toMatch(/obj2 = \{\s*otherValue: 1\s*};/);
      });
    });
  });
});
