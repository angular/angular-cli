// TODO: move this in its own package.
import * as path from 'path';
import * as ts from 'typescript';
import {SourceMapConsumer, SourceMapGenerator} from 'source-map';

const MagicString = require('magic-string');


export interface TranspileOutput {
  outputText: string;
  sourceMap: any | null;
}

export class TypeScriptFileRefactor {
  private _sourceFile: ts.SourceFile;
  private _sourceString: any;
  private _sourceText: string;
  private _changed: boolean = false;

  get fileName() { return this._fileName; }
  get sourceFile() { return this._sourceFile; }
  get sourceText() { return this._sourceString.toString(); }

  constructor(private _fileName: string,
              private _host: ts.CompilerHost,
              private _program?: ts.Program) {
    if (_program) {
      this._sourceFile = _program.getSourceFile(_fileName);
    }
    if (!this._sourceFile) {
      this._program = null;
      this._sourceFile = ts.createSourceFile(_fileName, _host.readFile(_fileName),
        ts.ScriptTarget.Latest);
    }
    this._sourceText = this._sourceFile.getFullText(this._sourceFile);
    this._sourceString = new MagicString(this._sourceText);
  }

  getDiagnostics(): ts.Diagnostic[] {
    if (!this._program) {
      return [];
    }

    return this._program.getSyntacticDiagnostics(this._sourceFile)
      .concat(this._program.getSemanticDiagnostics(this._sourceFile))
      .concat(this._program.getDeclarationDiagnostics(this._sourceFile));
  }

  /**
   * Find all nodes from the AST in the subtree of node of SyntaxKind kind.
   * @param node
   * @param kind
   * @param recursive Whether to go in matched nodes to keep matching.
   * @param max The maximum number of items to return.
   * @return all nodes of kind, or [] if none is found
   */
  findAstNodes(node: ts.Node,
               kind: ts.SyntaxKind,
               recursive = false,
               max: number = Infinity): ts.Node[] {
    if (!node || max == 0) {
      return [];
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

  appendAfter(node: ts.Node, text: string): void {
    this._sourceString.insertRight(node.getEnd(), text);
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
      this.appendAfter(maybeImports[0].elements[maybeImports[0].elements.length - 1],
        `, ${symbolName}`);
    } else {
      // Find the last import and insert after.
      this.appendAfter(allImports[allImports.length - 1],
        `import {${symbolName}} from '${modulePath}';`);
    }
  }

  removeNode(node: ts.Node) {
    this._sourceString.remove(node.getStart(this._sourceFile), node.getEnd());
    this._changed = true;
  }

  replaceNode(node: ts.Node, replacement: string) {
    let replaceSymbolName: boolean = node.kind === ts.SyntaxKind.Identifier;
    this._sourceString.overwrite(node.getStart(this._sourceFile),
                                 node.getEnd(),
                                 replacement,
                                 replaceSymbolName);
    this._changed = true;
  }

  sourceMatch(re: RegExp) {
    return this._sourceText.match(re) !== null;
  }

  transpile(compilerOptions: ts.CompilerOptions): TranspileOutput {
    // const basePath = path.resolve(path.dirname(tsConfigPath),
    //   tsConfig.config.compilerOptions.baseUrl || '.');
    compilerOptions = Object.assign({}, compilerOptions, {
      sourceMap: true,
      inlineSources: false,
      inlineSourceMap: false,
      sourceRoot: ''
    });

    const source = this.sourceText;
    const result = ts.transpileModule(source, {
      compilerOptions,
      fileName: this._fileName
    });

    if (result.sourceMapText) {
      const sourceMapJson = JSON.parse(result.sourceMapText);
      sourceMapJson.sources = [ this._fileName ];

      const consumer = new SourceMapConsumer(sourceMapJson);
      const map = SourceMapGenerator.fromSourceMap(consumer);
      if (this._changed) {
        const sourceMap = this._sourceString.generateMap({
          file: path.basename(this._fileName.replace(/\.ts$/, '.js')),
          source: this._fileName,
          hires: true,
        });
        map.applySourceMap(new SourceMapConsumer(sourceMap), this._fileName);
      }

      const sourceMap = map.toJSON();
      sourceMap.sources = [ this._fileName ];
      sourceMap.file = path.basename(this._fileName, '.ts') + '.js';
      sourceMap.sourcesContent = [ this._sourceText ];

      return { outputText: result.outputText, sourceMap };
    } else {
      return {
        outputText: result.outputText,
        sourceMap: null
      };
    }
  }
}
