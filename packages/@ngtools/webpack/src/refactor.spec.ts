import * as path from 'path';
import * as ts from 'typescript';

import { WebpackCompilerHost } from './compiler_host';
import { TypeScriptFileRefactor } from './refactor';
import { ProgramManager } from './program_manager';

// TODO add programless test
fdescribe('@ngtools/webpack', () => {
  describe('TypeScriptFileRefactor', () => {
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

    let refactor: TypeScriptFileRefactor, firstVarStmt: ts.Node, host: WebpackCompilerHost;

    beforeEach(() => {
      const host = new WebpackCompilerHost({}, '');
      host.writeFile('/file.ts', fileContent, false);
      refactor = new TypeScriptFileRefactor('/file.ts', host);
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
        expect(refactor.sourceText).toContain('const value = 42;');
        expect(refactor.sourceText).toContain('const obj = {};');
        expect(refactor.sourceText).toContain('const bool = true;');
      });

      it('removeNode should work', () => {
        refactor.removeNode(firstVarStmt);
        expect(refactor.sourceText).not.toContain('const value = 42;');
      });

      it('removeNodes should work', () => {
        const varStmts = refactor.findAstNodes(null, ts.SyntaxKind.VariableStatement);
        refactor.removeNodes(...varStmts);
        expect(refactor.sourceText).not.toContain('const value = 42;');
        expect(refactor.sourceText).not.toContain('const obj = {};');
        expect(refactor.sourceText).not.toContain('const bool = true;');
      });

      it('replaceNode should work', () => {
        refactor.replaceNode(firstVarStmt, 'const idx = 1;');
        expect(refactor.sourceText).not.toContain('const value = 42;');
        expect(refactor.sourceText).toContain('const idx = 1;');
      });

      it('appendNode should work', () => {
        refactor.appendNode(firstVarStmt, 'const idx = 1;');
        expect(refactor.sourceText).toMatch(/const value = 42;\s*const idx = 1;/);
      });

      it('prependNode should work', () => {
        refactor.prependNode(firstVarStmt, 'const idx = 1;');
        expect(refactor.sourceText).toMatch(/const idx = 1;\s*const value = 42;/);
      });

      it('transforms should work together', () => {
        const varStmts = refactor.findAstNodes(null, ts.SyntaxKind.VariableStatement);

        refactor.prependNode(varStmts[0], 'const idx = 1;\n');
        refactor.appendNode(varStmts[0], '\nconst str = "str";');
        refactor.removeNode(varStmts[1]);
        refactor.replaceNode(varStmts[2], 'const key = "key";');

        expect(refactor.sourceText).toMatch(
          /const idx = 1;\s*const value = 42;\s*const str = "str";\s*const key = "key";/
        );
      });
    });

    describe('insertImport', () => {
      beforeEach(() => {
        const host = new WebpackCompilerHost({}, '');
        host.writeFile('/file.ts', `
          import { something } from 'some-module';
          const value = something;
        `, false);

        refactor = new TypeScriptFileRefactor('/file.ts', host);
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

      it('should work when there are no imports', () => {
        const host = new WebpackCompilerHost({}, '');
        host.writeFile('/file.ts', `const value = 42;`, false);
        refactor = new TypeScriptFileRefactor('/file.ts', host);

        refactor.insertImport('symbolName', 'modulePath');

        expect(refactor.sourceText).toContain(
          `import {symbolName} from 'modulePath';`
        );
      });
    });

    describe('transpile', () => {
      beforeEach(() => {
        host = new WebpackCompilerHost({}, '');
        host.writeFile('/file.ts', fileContent, false);
      });

      it('should work without program', () => {
        refactor = new TypeScriptFileRefactor('/file.ts', host);
        const varStmts = refactor.findAstNodes(null, ts.SyntaxKind.VariableStatement);

        refactor.prependNode(varStmts[0], 'const idx = 1;\n');
        refactor.appendNode(varStmts[0], '\nconst str = "str";');
        refactor.removeNode(varStmts[1]);
        refactor.replaceNode(varStmts[2], 'const key = "key";');

        const transpileOutput = refactor.transpile();

        expect(transpileOutput.outputText).toMatch(
          /var idx = 1;\s*var value = 42;\s*var str = "str";\s*var key = "key";/
        );
      });

      it('should work without program', () => {
        // add comments to constructor about the possible modes
        // need to update program with right file contents, as well as update whenever we do
        // new sourcefile stuff
        const programManager = new ProgramManager(['/file.ts'], compilerOptions, host);
        refactor = new TypeScriptFileRefactor('/file.ts', host, programManager);
        const varStmts = refactor.findAstNodes(null, ts.SyntaxKind.VariableStatement);

        refactor.prependNode(varStmts[0], 'const idx = 1;\n');
        refactor.appendNode(varStmts[0], '\nconst str = "str";');
        refactor.removeNode(varStmts[1]);
        refactor.replaceNode(varStmts[2], 'const key = "key";');

        const transpileOutput = refactor.transpile();

        expect(transpileOutput.outputText).toMatch(
          /var idx = 1;\s*var value = 42;\s*var str = "str";\s*var key = "key";/
        );
      });
    });

    describe('update program', () => {
      beforeEach(() => {
        host = new WebpackCompilerHost({}, '');
        host.writeFile('/file.ts', `
          export const value = 42;
        `, false);
      });

      it('should update the program by file path', () => {
        host.writeFile('/file2.ts', `
          import { value } from './file';
          console.log(value);
        `, false);

        const programManager = new ProgramManager(['/file.ts'], compilerOptions, host);
        refactor = new TypeScriptFileRefactor('/file2.ts', host, programManager);
        refactor.appendNode(refactor.getLastNode(), 'console.log(43);');

        const output = refactor.transpile().outputText;
        expect(output).toContain('console.log(43)');
      });

      it('should update the program by file source', () => {
        const programManager = new ProgramManager(['/file.ts'], compilerOptions, host);
        refactor = new TypeScriptFileRefactor('/file2.ts', host, programManager, `
          import { value } from './file';
          console.log(value);
        `);
        refactor.appendNode(refactor.getLastNode(), 'console.log(43);');

        const output = refactor.transpile().outputText;
        expect(output).toContain('console.log(43)');
      });
    });

    fdescribe('sourcemaps', () => {
      beforeEach(() => {
        // Do a bunch of transforms.
        const varStmts = refactor.findAstNodes(null, ts.SyntaxKind.VariableStatement);

        refactor.prependNode(varStmts[0], 'const idx = 1;');
        refactor.appendNode(varStmts[0], 'const str = "str";');
        refactor.removeNode(varStmts[1]);
        refactor.replaceNode(varStmts[2], 'const key = "key";');
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
        refactor = new TypeScriptFileRefactor('/file.ts', host, programManager);
        const transpileOutput = refactor.transpile();

        expect(transpileOutput.sourceMap).toBeNull();
      });
    });
  });
});
