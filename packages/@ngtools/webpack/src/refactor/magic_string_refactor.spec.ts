import * as ts from 'typescript';

import { WebpackCompilerHost } from '../compiler_host';
import { TypeScriptMagicStringFileRefactor } from './magic_string_refactor';
import { ProgramManager } from '../program_manager';


describe('@ngtools/webpack', () => {
  describe('TypeScriptMagicStringFileRefactor', () => {
    let host, programManager, refactor: TypeScriptMagicStringFileRefactor, firstDecorator: ts.Node;

    beforeEach(() => {
      host = new WebpackCompilerHost({}, '');
      host.writeFile('/file.ts', `
        @SomeDecorator() class CLS {}
        const value = 42;
      `, false);

      programManager = new ProgramManager(['/file.ts'], {}, host);
      refactor = new TypeScriptMagicStringFileRefactor('/file.ts', host, programManager);

      firstDecorator = refactor.findFirstAstNode(refactor.sourceFile, ts.SyntaxKind.Decorator);
    });

    it('removeNode should work', () => {
      refactor.removeNode(firstDecorator);
      expect(refactor.sourceText).toEqual(`
         class CLS {}
        const value = 42;
      `);
    });

    it('replaceNode should work', () => {
      refactor.replaceNode(firstDecorator, ts.createIdentifier('@AnotherDecorator()'));

      expect(refactor.sourceText).toEqual(`
        @AnotherDecorator() class CLS {}
        const value = 42;
      `);
    });

    it('appendNode should work', () => {
      refactor.appendNode(firstDecorator, ts.createIdentifier('class CLS2 {};'));

      expect(refactor.sourceText).toEqual(`
        @SomeDecorator()class CLS2 {}; class CLS {}
        const value = 42;
      `);
    });

    it('appendNode should work', () => {
      refactor.appendNode(firstDecorator, ts.createIdentifier('class CLS2 {};'));

      expect(refactor.sourceText).toEqual(`
        @SomeDecorator()class CLS2 {}; class CLS {}
        const value = 42;
      `);
    });

    describe('insertImport', () => {
      beforeEach(() => {
        const host = new WebpackCompilerHost({}, '');
        host.writeFile('/file.ts', `
          import { something } from 'some-module';
          const value = something;
        `, false);

        programManager = new ProgramManager(['/file.ts'], {}, host);
        refactor = new TypeScriptMagicStringFileRefactor('/file.ts', host, programManager);
      });

      it('should append new import after existing imports statements', () => {
        refactor.insertImport('symbolName', 'modulePath');

        expect(refactor.sourceText).toContain(
          `import { something } from 'some-module';import {symbolName} from 'modulePath';`
        );
      });

      it('should append new import after existing named imports', () => {
        refactor.insertImport('somethingElse', 'some-module');

        expect(refactor.sourceText).toContain(
          `import { something, somethingElse } from 'some-module';`
        );
      });
    });
  });
});
