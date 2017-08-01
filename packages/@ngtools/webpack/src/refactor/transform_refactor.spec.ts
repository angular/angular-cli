import * as ts from 'typescript';
import * as path from 'path';

import { WebpackCompilerHost } from '../compiler_host';
import { TypeScriptFileTransformRefactor } from './transform_refactor';
import { ProgramManager } from '../program_manager';


describe('@ngtools/webpack', () => {
  describe('TypeScriptFileTransformRefactor', () => {
    const compilerOptions = {
      target: ts.ScriptTarget.ES5,
      module: ts.ModuleKind.ES2015,
      emitDecoratorMetadata: true,
      experimentalDecorators: true,
      sourceMap: true,
      inlineSources: true,
      inlineSourceMap: false,
      sourceRoot: '',
    };

    const fileContent = `
      const value = 42;
      const obj = {};
      const bool = true;
    `;

    let refactor: TypeScriptFileTransformRefactor,
      firstVarStmt: ts.Node;

    beforeEach(() => {
      const host = new WebpackCompilerHost({}, '');
      host.writeFile('/file.ts', fileContent, false);

      const programManager = new ProgramManager(['/file.ts'], compilerOptions, host);
      refactor = new TypeScriptFileTransformRefactor('/file.ts', host, programManager);

      firstVarStmt = refactor.findFirstAstNode(null, ts.SyntaxKind.VariableStatement);
    });

    describe('lookups', () => {
      it('findAstNodes should work', () => {
        const varStmts = refactor.findAstNodes(null, ts.SyntaxKind.VariableStatement);
        expect(varStmts[0].getText()).toContain('const value = 42;');
        expect(varStmts[1].getText()).toContain('const obj = {};');
        expect(varStmts[2].getText()).toContain('const bool = true;');
      });

      it('findFirstAstNode should work', () => {
        const firstVarStmt = refactor.findFirstAstNode(null, ts.SyntaxKind.VariableStatement);
        expect(firstVarStmt.getText()).toContain('const value = 42;');
      });

      it('getFirstNode should work', () => {
        expect(refactor.getFirstNode().getText()).toContain('const value = 42;');
      });

      it('getLastNode should work', () => {
        expect(refactor.getLastNode().getText()).toContain('const bool = true;');
      });
    });

    describe('transforms', () => {
      it('not doing any should work', () => {
        expect(refactor.transpile().outputText).toContain('var value = 42;');
        expect(refactor.transpile().outputText).toContain('var obj = {};');
        expect(refactor.transpile().outputText).toContain('var bool = true;');
      });

      it('removeNode should work', () => {
        refactor.removeNode(firstVarStmt);
        expect(refactor.transpile().outputText).not.toContain('const value = 42;');
      });

      it('removeNodes should work', () => {
        const varStmts = refactor.findAstNodes(null, ts.SyntaxKind.VariableStatement);
        refactor.removeNodes(varStmts);
        expect(refactor.transpile().outputText).not.toContain('const value = 42;');
        expect(refactor.transpile().outputText).not.toContain('const bool = true;');
      });

      it('replaceNode should work', () => {
        // var idx = 1;
        const varStmt = ts.createVariableStatement(undefined, [
          ts.createVariableDeclaration('idx', undefined, ts.createNumericLiteral('1'))
        ]);

        refactor.replaceNode(firstVarStmt, varStmt);

        expect(refactor.transpile().outputText).not.toContain('const value = 42;');
        expect(refactor.transpile().outputText).toContain('var idx = 1;');
      });

      it('appendNode should work', () => {
        // var idx = 1;
        const varStmt = ts.createVariableStatement(undefined, [
          ts.createVariableDeclaration('idx', undefined, ts.createNumericLiteral('1'))
        ]);

        refactor.appendNode(firstVarStmt, varStmt);

        expect(refactor.transpile().outputText).toMatch(/var value = 42;\s*var idx = 1;/);
      });

      it('prependNode should work', () => {
        // var idx = 1;
        const varStmt = ts.createVariableStatement(undefined, [
          ts.createVariableDeclaration('idx', undefined, ts.createNumericLiteral('1'))
        ]);

        refactor.prependNode(firstVarStmt, varStmt);

        expect(refactor.transpile().outputText).toMatch(/var idx = 1;\s*var value = 42;/);
      });

      it('transforms should work together', () => {
        // var idx = 1;
        const varStmt = ts.createVariableStatement(undefined, [
          ts.createVariableDeclaration('idx', undefined, ts.createNumericLiteral('1'))
        ]);
        // var str = "str";
        const varStmt2 = ts.createVariableStatement(undefined, [
          ts.createVariableDeclaration('str', undefined, ts.createLiteral('str'))
        ]);
        // var key = "key";
        const varStmt3 = ts.createVariableStatement(undefined, [
          ts.createVariableDeclaration('key', undefined, ts.createLiteral('key'))
        ]);

        const varStmts = refactor.findAstNodes(null, ts.SyntaxKind.VariableStatement);

        refactor.prependNode(varStmts[0], varStmt);
        refactor.appendNode(varStmts[0], varStmt2);
        refactor.removeNode(varStmts[1]);
        refactor.replaceNode(varStmts[2], varStmt3);

        expect(refactor.transpile().outputText).toMatch(
          /var idx = 1;\s*var value = 42;\s*var str = "str";\s*var key = "key";/
        );
      });
    });

    describe('insertImport', () => {

      let refactor: TypeScriptFileTransformRefactor;

      beforeEach(() => {
        const host = new WebpackCompilerHost({}, '');
        host.writeFile('/file.ts', `
          import { something } from 'some-module';
          const value = something;
        `, false);

        const programManager = new ProgramManager(['/file.ts'], compilerOptions, host);
        refactor = new TypeScriptFileTransformRefactor('/file.ts', host, programManager);
      });

      it('should append new import after existing imports statements', () => {
        refactor.insertImport('symbolName', 'modulePath');

        expect(refactor.transpile().outputText).toMatch(
          /import { something } from 'some-module';\s*import { symbolName } from "modulePath";/
        );
      });

      it('should work when there are no imports', () => {
        const host = new WebpackCompilerHost({}, '');
        host.writeFile('/file.ts', `const value = 42;`, false);
        const programManager = new ProgramManager(['/file.ts'], compilerOptions, host);
        refactor = new TypeScriptFileTransformRefactor('/file.ts', host, programManager);

        refactor.insertImport('symbolName', 'modulePath');

        expect(refactor.transpile().outputText).toContain(
          `import { symbolName } from "modulePath";`
        );
      });

      it('should append new import after existing named imports', () => {
        refactor.insertImport('somethingElse', 'some-module');

        expect(refactor.transpile().outputText).toContain(
          `import { something, somethingElse } from 'some-module';`
        );
      });
    });

    describe('outDir', () => {
      it('should work with outDir', () => {
        // Make a new refactor and add a transform.
        const host = new WebpackCompilerHost({}, '');
        host.writeFile('/file.ts', fileContent, false);
        const newCompilerOptions = Object.assign({ outDir: '/path/' }, compilerOptions);
        const programManager = new ProgramManager(['/file.ts'], newCompilerOptions, host);
        refactor = new TypeScriptFileTransformRefactor('/file.ts', host, programManager);
        const varStmt = ts.createVariableStatement(undefined, [
          ts.createVariableDeclaration('idx', undefined, ts.createNumericLiteral('1'))
        ]);
        const varStmts = refactor.findAstNodes(null, ts.SyntaxKind.VariableStatement);
        refactor.prependNode(varStmts[0], varStmt);

        expect(refactor.transpile().outputText).toContain('var idx = 1;');
      });

      it('should work without outDir', () => {
        // Make a new refactor and add a transform.
        const host = new WebpackCompilerHost({}, '');
        host.writeFile('/file.ts', fileContent, false);
        const programManager = new ProgramManager(['/file.ts'], compilerOptions, host);
        refactor = new TypeScriptFileTransformRefactor('/file.ts', host, programManager);
        const varStmt = ts.createVariableStatement(undefined, [
          ts.createVariableDeclaration('idx', undefined, ts.createNumericLiteral('1'))
        ]);
        const varStmts = refactor.findAstNodes(null, ts.SyntaxKind.VariableStatement);
        refactor.prependNode(varStmts[0], varStmt);

        expect(refactor.transpile().outputText).toContain('var idx = 1;');
      });
    });

    describe('update program', () => {
      it('should update the program by file path', () => {
        const host = new WebpackCompilerHost({}, '');
        host.writeFile('/file.ts', `
          export const value = 42;
        `, false);
        host.writeFile('/file2.ts', `
          import { value } from './file';
          console.log(value);
        `, false);

        const programManager = new ProgramManager(['/file.ts'], compilerOptions, host);
        refactor = new TypeScriptFileTransformRefactor('/file2.ts', host, programManager);
        refactor.appendNode(refactor.getLastNode(), ts.createIdentifier('console.log(43);'));

        const output = refactor.transpile().outputText;
        expect(output).toContain('console.log(43)');
      });

      it('should update the program by file source', () => {
        const host = new WebpackCompilerHost({}, '');
        host.writeFile('/file.ts', `
          export const value = 42;
        `, false);

        const programManager = new ProgramManager(['/file.ts'], compilerOptions, host);
        refactor = new TypeScriptFileTransformRefactor('/file2.ts', host, programManager, `
          import { value } from './file';
          console.log(value);
        `);
        refactor.appendNode(refactor.getLastNode(), ts.createIdentifier('console.log(43);'));

        const output = refactor.transpile().outputText;
        expect(output).toContain('console.log(43)');
      });
    });

    describe('sourcemaps', () => {
      beforeEach(() => {
        // Do a bunch of transforms.

        // var idx = 1;
        const varStmt = ts.createVariableStatement(undefined, [
          ts.createVariableDeclaration('idx', undefined, ts.createNumericLiteral('1'))
        ]);
        // var str = "str";
        const varStmt2 = ts.createVariableStatement(undefined, [
          ts.createVariableDeclaration('str', undefined, ts.createLiteral('str'))
        ]);
        // var key = "key";
        const varStmt3 = ts.createVariableStatement(undefined, [
          ts.createVariableDeclaration('key', undefined, ts.createLiteral('key'))
        ]);

        const varStmts = refactor.findAstNodes(null, ts.SyntaxKind.VariableStatement);

        refactor.prependNode(varStmts[0], varStmt);
        refactor.appendNode(varStmts[0], varStmt2);
        refactor.removeNode(varStmts[1]);
        refactor.replaceNode(varStmts[2], varStmt3);
      });

      it('should output sourcemaps', () => {
        const transpileOutput = refactor.transpile();
        expect(transpileOutput.sourceMap).toBeTruthy();
      });

      it('should output sourcemaps with file, sources and sourcesContent', () => {
        const transpileOutput = refactor.transpile();
        const { file, sources, sourcesContent } = transpileOutput.sourceMap;
        expect(file).toBe('file.js');
        expect(sources[0]).toBe(`${path.sep}file.ts`);
        expect(sourcesContent[0]).toBe(fileContent);
      });

      it('should not output sourcemaps if they are off', () => {
        const compilerOptions = {
          target: ts.ScriptTarget.ESNext,
          sourceMap: false,
          sourceRoot: ''
        };

        const host = new WebpackCompilerHost({}, '');
        host.writeFile('/file.ts', `
          const value = 42;
          const obj = {};
          const bool = true;
        `, false);

        const programManager = new ProgramManager(['/file.ts'], compilerOptions, host);
        refactor = new TypeScriptFileTransformRefactor('/file.ts', host, programManager);
        const transpileOutput = refactor.transpile();

        expect(transpileOutput.sourceMap).toBeNull();
      });
    });
  });
});
