// TODO: move this in its own package.
import * as path from 'path';
import * as ts from 'typescript';
import {SourceMapConsumer, SourceMapGenerator} from 'source-map';

const MagicString = require('magic-string');


export interface TranspileOutput {
  outputText: string;
  sourceMap: any | null;
}


function resolve(filePath: string, _host: ts.CompilerHost, program: ts.Program) {
  if (path.isAbsolute(filePath)) {
    return filePath;
  }
  const compilerOptions = program.getCompilerOptions();
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
  private _changed = false;

  get fileName() { return this._fileName; }
  get sourceFile() { return this._sourceFile; }
  get sourceText() { return this._sourceString.toString(); }

  constructor(fileName: string,
              _host: ts.CompilerHost,
              private _program?: ts.Program,
              source?: string | null) {
    fileName = resolve(fileName, _host, _program).replace(/\\/g, '/');
    this._fileName = fileName;
    if (_program) {
      if (source) {
        this._sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
      } else {
        this._sourceFile = _program.getSourceFile(fileName);
      }
    }
    if (!this._sourceFile) {
      this._sourceFile = ts.createSourceFile(fileName, source || _host.readFile(fileName),
        ts.ScriptTarget.Latest, true);
    }
    this._sourceText = this._sourceFile.getFullText(this._sourceFile);
    this._sourceString = new MagicString(this._sourceText);
  }

  /**
   * Collates the diagnostic messages for the current source file
   */
  getDiagnostics(typeCheck = true): ts.Diagnostic[] {
    if (!this._program) {
      return [];
    }
    let diagnostics: ts.Diagnostic[] = [];
    // only concat the declaration diagnostics if the tsconfig config sets it to true.
    if (this._program.getCompilerOptions().declaration == true) {
      diagnostics = diagnostics.concat(this._program.getDeclarationDiagnostics(this._sourceFile));
    }
    diagnostics = diagnostics.concat(
      this._program.getSyntacticDiagnostics(this._sourceFile),
      typeCheck ? this._program.getSemanticDiagnostics(this._sourceFile) : []);

    return diagnostics;
  }

  /**
   * Find all nodes from the AST in the subtree of node of SyntaxKind kind.
   * @param node The root node to check, or null if the whole tree should be searched.
   * @param kind The kind of nodes to find.
   * @param recursive Whether to go in matched nodes to keep matching.
   * @param max The maximum number of items to return.
   * @return all nodes of kind, or [] if none is found
   */
  findAstNodes(node: ts.Node | null,
               kind: ts.SyntaxKind,
               recursive = false,
               max: number = Infinity): ts.Node[] {
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

  appendAfter(node: ts.Node, text: string): void {
    this._sourceString.appendRight(node.getEnd(), text);
  }
  append(node: ts.Node, text: string): void {
    this._sourceString.appendLeft(node.getEnd(), text);
  }

  prependBefore(node: ts.Node, text: string) {
    this._sourceString.appendLeft(node.getStart(), text);
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

  removeNodes(...nodes: ts.Node[]) {
    nodes.forEach(node => node && this.removeNode(node));
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
    const source = this.sourceText;
    const result = ts.transpileModule(source, {
      compilerOptions: Object.assign({}, compilerOptions, {
        sourceMap: true,
        inlineSources: false,
        inlineSourceMap: false,
        sourceRoot: ''
      }),
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
      const fileName = process.platform.startsWith('win')
                     ? this._fileName.replace(/\//g, '\\')
                     : this._fileName;
      sourceMap.sources = [ fileName ];
      sourceMap.file = path.basename(fileName, '.ts') + '.js';
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
