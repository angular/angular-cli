// TODO: move this in its own package.
import * as path from 'path';
import * as ts from 'typescript';
import {SourceMapConsumer, SourceMapGenerator} from 'source-map';

const MagicString = require('magic-string');

import {TypeScriptFileRefactor, TranspileOutput, resolve} from './refactor';
import {ProgramManager} from '../program_manager';


export class TypeScriptMagicStringFileRefactor implements TypeScriptFileRefactor {
  private _fileName: string;
  private _sourceFile: ts.SourceFile;
  private _sourceString: any;
  private _sourceText: string;
  private _compilerOptions: ts.CompilerOptions = {};
  private _changed = false;

  get fileName() { return this._fileName; }
  get sourceFile() { return this._sourceFile; }
  get sourceText() { return this._sourceString.toString(); }

  constructor(fileName: string,
              _host: ts.CompilerHost,
              private _programManager?: ProgramManager,
              source?: string | null) {

    const program = _programManager.program;
    fileName = resolve(fileName, _host, program).replace(/\\/g, '/');
    this._fileName = fileName;
    if (program) {
      this._compilerOptions = program.getCompilerOptions();
      if (source) {
        this._sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
      } else {
        this._sourceFile = program.getSourceFile(fileName);
      }
    }
    if (!this._sourceFile) {
      this._sourceFile = ts.createSourceFile(fileName, source || _host.readFile(fileName),
        ts.ScriptTarget.Latest, true);
    }
    this._sourceText = this._sourceFile.getFullText(this._sourceFile);
    this._sourceString = new MagicString(this._sourceText);
  }

  // Nodes don't always have text, and .getText() fails on nodes created manually.
  // We have to duck type it.
  _getNodeText(node: ts.Node) {
    const text = (node as any).text;
    if (text === undefined) {
      throw new Error('Refactor failed to retrieve node text.');
    }

    return text;
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

  getFirstNode(): ts.Node | null {
    const syntaxList = this.findFirstAstNode(null, ts.SyntaxKind.SyntaxList);
    return (syntaxList && syntaxList.getChildCount() > 0) ? syntaxList.getChildAt(0) : null;
  }

  getLastNode(): ts.Node | null {
    const syntaxList = this.findFirstAstNode(null, ts.SyntaxKind.SyntaxList);
    const childCount = syntaxList.getChildCount();
    return childCount > 0 ? syntaxList.getChildAt(childCount - 1) : null;
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

  appendNode(node: ts.Node, newNode: ts.Node): void {
    this._sourceString.appendRight(node.getEnd(), this._getNodeText(newNode));
  }

  prependNode(node: ts.Node, newNode: ts.Node) {
    this._sourceString.appendLeft(node.getStart(), this._getNodeText(newNode));
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
        ts.createIdentifier(`, ${symbolName}`));
    } else {
      // Find the last import and insert after.
      this.appendNode(allImports[allImports.length - 1],
        ts.createIdentifier(`import {${symbolName}} from '${modulePath}';`));
    }
  }

  removeNode(node: ts.Node) {
    this._sourceString.remove(node.getStart(this._sourceFile), node.getEnd());
    this._changed = true;
  }

  removeNodes(nodes: ts.Node[]) {
    nodes.forEach(node => node && this.removeNode(node));
  }

  replaceNode(node: ts.Node, replacementNode: ts.Node) {
    const replacementString = this._getNodeText(replacementNode);
    let replaceSymbolName: boolean = node.kind === ts.SyntaxKind.Identifier;
    this._sourceString.overwrite(node.getStart(this._sourceFile),
                                 node.getEnd(),
                                 replacementString,
                                 { storeName: replaceSymbolName });
    this._changed = true;
  }

  sourceMatch(re: RegExp) {
    return this._sourceText.match(re) !== null;
  }

  transpile(compilerOptions: ts.CompilerOptions): TranspileOutput {
    const source = this.sourceText;
    const result = ts.transpileModule(source, {
      compilerOptions: Object.assign({},
        this._compilerOptions,
        compilerOptions,
        {
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
