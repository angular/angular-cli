// TODO: move this in its own package.
import * as path from 'path';
import * as ts from 'typescript';
import { SourceMapConsumer, SourceMapGenerator } from 'source-map';

const MagicString = require('magic-string');

import { ProgramManager } from './program_manager';

export interface TranspileOutput {
  outputText: string;
  sourceMap: any | null;
}


function resolve(filePath: string, _host: ts.CompilerHost, programManager: ProgramManager) {
  if (path.isAbsolute(filePath) || !programManager) {
    return filePath;
  }
  const compilerOptions = programManager.program.getCompilerOptions();
  const basePath = compilerOptions.baseUrl || compilerOptions.rootDir;
  if (!basePath) {
    throw new Error(`Trying to resolve '${filePath}' without a basePath.`);
  }
  return path.join(basePath, filePath);
}


export class TypeScriptFileRefactor {
  private _fileName: string;
  private _sourceFile: ts.SourceFile;
  private _sourceString: any;
  private _sourceText: string;
  private _compilerOptions: ts.CompilerOptions = {};
  private _changed = false;

  get fileName() { return this._fileName; }
  get sourceFile() { return this._sourceFile; }
  get sourceText() { return this._sourceString.toString(); }

  constructor(
    fileName: string,
    private _host: ts.CompilerHost,
    private _programManager?: ProgramManager,
    source?: string | null
  ) {

    if (!fileName.endsWith('.ts')) {
      throw new Error(`Unable to refactor non-TS file: ${fileName}.`);
    }

    fileName = resolve(fileName, _host, _programManager!).replace(/\\/g, '/');
    this._fileName = fileName;

    // When there is a program, manage files inside it.
    if (_programManager && _programManager.program) {
      this._compilerOptions = _programManager.program.getCompilerOptions();
      if (source || !_programManager.hasFile(fileName)) {
        this._host.writeFile(fileName, source || _host.readFile(fileName), false);
        this._programManager.update([fileName]);
      }
      this._sourceFile = _programManager.program.getSourceFile(fileName);
    } else {
      // Otherwise just create a sourcefile to use for lookups.
      // ts.transpileModule will then use the source string directly.
      this._sourceFile = ts.createSourceFile(fileName, source || _host.readFile(fileName),
        ts.ScriptTarget.Latest, true);
    }

    // Something bad happened and we couldn't find the TS source.
    if (!this._sourceFile) {
      throw new Error(`Could not retrieve TS Source for ${this._fileName}.`);
    }

    this._sourceText = this._sourceFile.getFullText(this._sourceFile);
    this._sourceString = new MagicString(this._sourceText);
  }

  // Lookups.

  /**
   * Find all nodes from the AST in the subtree of node of SyntaxKind kind.
   * @param node The root node to check, or null if the whole tree should be searched.
   * @param kind The kind of nodes to find.
   * @param recursive Whether to go in matched nodes to keep matching.
   * @param max The maximum number of items to return.
   * @return all nodes of kind, or [] if none is found
   */
  findAstNodes(
    node: ts.Node | null,
    kind: ts.SyntaxKind,
    recursive = false,
    max = Infinity
  ): ts.Node[] {
    if (max == 0) {
      return [];
    }
    if (!node) {
      node = this._sourceFile;
    }

    let arr: ts.Node[] = [];
    if (node.kind === kind) {
      // If we're not recursively looking for children, stop here.
      if (!recursive) {
        return [node];
      }

      arr.push(node);
      max--;
    }

    if (max > 0) {
      for (const child of node.getChildren(this._sourceFile)) {
        this.findAstNodes(child, kind, recursive, max)
          .forEach((node: ts.Node) => {
            if (max > 0) {
              arr.push(node);
            }
            max--;
          });

        if (max <= 0) {
          break;
        }
      }
    }
    return arr;
  }

  findFirstAstNode(node: ts.Node | null, kind: ts.SyntaxKind): ts.Node | null {
    return this.findAstNodes(node, kind, false, 1)[0] || null;
  }

  getFirstNode(): ts.Node | null {
    const syntaxList = this.findFirstAstNode(null, ts.SyntaxKind.SyntaxList);
    return (syntaxList && syntaxList.getChildCount() > 0) ? syntaxList.getChildAt(0) : null;
  }

  getLastNode(): ts.Node | null {
    const syntaxList = this.findFirstAstNode(null, ts.SyntaxKind.SyntaxList);
    const childCount = syntaxList.getChildCount();
    return childCount > 0 ? syntaxList.getChildAt(childCount - 1) : null;
  }

  // Transforms.

  appendNode(node: ts.Node, text: string): void {
    this._sourceString.appendRight(node.getEnd(), text);
    this._changed = true;
  }

  prependNode(node: ts.Node, text: string) {
    this._sourceString.appendLeft(node.getStart(), text);
    this._changed = true;
  }

  removeNode(node: ts.Node) {
    this._sourceString.remove(node.getStart(this._sourceFile), node.getEnd());
    this._changed = true;
  }

  removeNodes(...nodes: ts.Node[]) {
    nodes.forEach(node => node && this.removeNode(node));
  }

  replaceNode(node: ts.Node, replacement: string) {
    let replaceSymbolName: boolean = node.kind === ts.SyntaxKind.Identifier;
    this._sourceString.overwrite(node.getStart(this._sourceFile),
      node.getEnd(),
      replacement,
      { storeName: replaceSymbolName });
    this._changed = true;
  }

  insertImport(symbolName: string, modulePath: string): void {
    // Find all imports.
    const allImports = this.findAstNodes(this._sourceFile, ts.SyntaxKind.ImportDeclaration);
    const maybeImports = allImports
      .filter((node: ts.ImportDeclaration) => {
        // Filter all imports that do not match the modulePath.
        return node.moduleSpecifier.kind == ts.SyntaxKind.StringLiteral
          && (node.moduleSpecifier as ts.StringLiteral).text == modulePath;
      })
      .filter((node: ts.ImportDeclaration) => {
        // Remove import statements that are either `import 'XYZ'` or `import * as X from 'XYZ'`.
        const clause = node.importClause as ts.ImportClause;
        if (!clause || clause.name || !clause.namedBindings) {
          return false;
        }
        return clause.namedBindings.kind == ts.SyntaxKind.NamedImports;
      })
      .map((node: ts.ImportDeclaration) => {
        // Return the `{ ... }` list of the named import.
        return (node.importClause as ts.ImportClause).namedBindings as ts.NamedImports;
      });

    if (maybeImports.length) {
      // There's an `import {A, B, C} from 'modulePath'`.
      // Find if it's in either imports. If so, just return; nothing to do.
      const hasImportAlready = maybeImports.some((node: ts.NamedImports) => {
        return node.elements.some((element: ts.ImportSpecifier) => {
          return element.name.text == symbolName;
        });
      });
      if (hasImportAlready) {
        return;
      }
      // Just pick the first one and insert at the end of its identifier list.
      this.appendNode(maybeImports[0].elements[maybeImports[0].elements.length - 1],
        `, ${symbolName}`);
    } else {
      const newImport = `import {${symbolName}} from '${modulePath}';`;
      if (allImports.length > 0) {
        // Find the last import and insert after.
        this.appendNode(allImports[allImports.length - 1], newImport);
      } else {
        // Insert before the first node.
        this.prependNode(this.getFirstNode(), newImport);
      }
    }
  }

  /**
   * Collates the diagnostic messages for the current source file
   */
  getDiagnostics(typeCheck = true): ts.Diagnostic[] {
    const program = this._programManager.program;
    if (!program) {
      return [];
    }
    let diagnostics: ts.Diagnostic[] = [];
    // only concat the declaration diagnostics if the tsconfig config sets it to true.
    if (program.getCompilerOptions().declaration == true) {
      diagnostics = diagnostics.concat(program.getDeclarationDiagnostics(this._sourceFile));
    }
    diagnostics = diagnostics.concat(program.getSyntacticDiagnostics(this._sourceFile),
      typeCheck ? program.getSemanticDiagnostics(this._sourceFile) : []);

    return diagnostics;
  }

  /**
   * Transpiles the file with any changes added.
   */
  transpile(compilerOptions: ts.CompilerOptions = {}): TranspileOutput {
    const source = this.sourceText;

    let result: ts.TranspileOutput = {
      outputText: undefined,
      sourceMapText: undefined
    };

    // Use program.emit() if we have a program, otherwise use ts.transpileModule().
    if (this._programManager) {

      // Custom writeFile to catch output from emit.
      const writeFile = (fileName: string, data: string) => {
        if (path.extname(fileName) === '.js') {
          if (result.outputText !== undefined) {
            // This really shouldn't happen, so error out if it does.
            throw new Error(`Double JS emit for ${this._fileName}.`);
          }
          result.outputText = data;
        } else if (path.extname(fileName) === '.map') {
          result.sourceMapText = data;
        }
      };

      if (this._changed) {
        // Write the refactored file back to the host and update the program.
        this._host.writeFile(this._fileName, source, false);
        this._programManager.update();
        this._sourceFile = this._programManager.program.getSourceFile(this._fileName);
      }

      const { emitSkipped } = this._programManager.program.emit(this._sourceFile, writeFile);

      if (emitSkipped) {
        throw new Error(`${this._fileName} emit failed.`);
      }

      if (result.outputText === undefined) {
        // Something went wrong in reading the emitted file;
        throw new Error(`Could not retrieve emitted TypeScript for ${this._fileName}.`);
      }
    } else {
      result = ts.transpileModule(source, {
        compilerOptions: Object.assign({},
          compilerOptions,
          {
            sourceMap: true,
            inlineSources: false,
            inlineSourceMap: false,
            sourceRoot: ''
          }),
        fileName: this._fileName
      });
    }

    // Process the sourcemaps.
    if (result.sourceMapText) {
      const sourceMapJson = JSON.parse(result.sourceMapText);
      sourceMapJson.sources = [this._fileName];

      const consumer = new SourceMapConsumer(sourceMapJson);
      const map = SourceMapGenerator.fromSourceMap(consumer);

      // Chain sourcemaps back to original source.
      if (this._changed) {
        const sourceMap = this._sourceString.generateMap({
          file: path.basename(this._fileName.replace(/\.ts$/, '.js')),
          source: this._fileName,
          hires: true,
        });
        map.applySourceMap(new SourceMapConsumer(sourceMap), this._fileName);
      }

      const sourceMap = map.toJSON();
      const fileName = this._fileName.replace(/\//g, path.sep);
      sourceMap.sources = [fileName];
      sourceMap.file = path.basename(fileName, '.ts') + '.js';
      sourceMap.sourcesContent = [this._sourceText];

      return { outputText: result.outputText, sourceMap };
    } else {
      return {
        outputText: result.outputText,
        sourceMap: null
      };
    }
  }
}
