import * as path from 'path';
import * as ts from 'typescript';

import { TypeScriptFileRefactor, TranspileOutput, resolve } from './refactor';
import { ProgramManager } from '../program_manager';


export class TypeScriptFileTransformRefactor implements TypeScriptFileRefactor {
  private _fileName: string;
  private _sourceFile: ts.SourceFile;
  private _dropNodes: ts.Node[] = [];
  private _replaceNodes: { node: ts.Node, replacementNode: ts.Node }[] = [];
  private _addNodes: { node: ts.Node, before?: ts.Node, after?: ts.Node }[] = [];

  get fileName() { return this._fileName; }
  get sourceFile() { return this._sourceFile; }

  constructor(
    fileName: string,
    private _host: ts.CompilerHost,
    private _programManager: ProgramManager,
    source?: string | null
  ) {
    if (!fileName.endsWith('.ts')) {
      throw new Error('Unable to refactor non-TS files.');
    }

    const program = _programManager.program;
    fileName = this._normalize(resolve(fileName, _host, program));
    this._fileName = fileName;

    if (!source) {
      this._sourceFile = program.getSourceFile(fileName);
    }

    if (!this._sourceFile) {
      this._host.writeFile(fileName, source || _host.readFile(fileName), false);
      this._programManager.update([fileName]);
      this._sourceFile = _host.getSourceFile(fileName, ts.ScriptTarget.Latest);
    }

    // Something bad happened and we couldn't find the TS source.
    if (!this._sourceFile) {
      throw new Error(`Could not retrieve TS Source for ${this._fileName}.`);
    }
  }

  _normalize(path: string) {
    return path.replace(/\\/g, '/');
  }

  removeNode(node: ts.Node) {
    this._dropNodes.push(node);
  }

  removeNodes(nodes: ts.Node[]) {
    nodes.forEach(node => node && this.removeNode(node));
  }

  replaceNode(node: ts.Node, replacementNode: ts.Node) {
    this._replaceNodes.push({ node, replacementNode });
  }

  appendNode(node: ts.Node, newNode: ts.Node): void {
    this._addNodes.push({ node, after: newNode });
  }

  prependNode(node: ts.Node, newNode: ts.Node) {
    this._addNodes.push({ node, before: newNode });
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

  findFirstAstNode(node: ts.Node | null, kind: ts.SyntaxKind): ts.Node | null {
    return this.findAstNodes(node, kind, false, 1)[0] || null;
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
      this.appendNode(
        maybeImports[0].elements[maybeImports[0].elements.length - 1],
        ts.createImportSpecifier(undefined, ts.createIdentifier(symbolName))
      );
    } else {
      // Create the new import node.
      const namedImports = ts.createNamedImports([ts.createImportSpecifier(undefined,
        ts.createIdentifier(symbolName))]);
      // typescript@2.4 fixes the function parameter types of ts.createImportClause.
      // https://github.com/Microsoft/TypeScript/pull/15999
      const importClause = (ts.createImportClause as any)(undefined, namedImports);
      const newImport = ts.createImportDeclaration(undefined, undefined, importClause,
        ts.createLiteral(modulePath));

      if (allImports.length > 0) {
        // Find the last import and insert after.
        this.appendNode(allImports[allImports.length - 1], newImport);
      } else {
        // Insert before the first node.
        this.prependNode(this.getFirstNode(), newImport);
      }
    }
  }

  private _getTransform(): ts.TransformerFactory<ts.SourceFile> {
    const dropNodes = this._dropNodes;
    const replaceNodes = this._replaceNodes;
    const addNodes = this._addNodes;

    return (context: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {
      const transformer: ts.Transformer<ts.SourceFile> = (sf: ts.SourceFile) => {

        const visitor: ts.Visitor = (node) => {
          // Check if node should be dropped.
          if (dropNodes.find((n) => n === node)) {
            return undefined;
          }

          // Check if node should be replaced.
          const replace = replaceNodes.find((rpl) => rpl.node === node);
          if (replace) {
            return replace.replacementNode;
          }

          // Check if node should be added to.
          const add = addNodes.filter((a) => a.node === node);
          if (add.length > 0) {
            return [
              ...add.filter((a) => a.before).map(((a) => a.before)),
              node,
              ...add.filter((a) => a.after).map(((a) => a.after))
            ];
          }

          // Otherwise return node as is.
          return ts.visitEachChild(node, visitor, context);
        };

        return ts.visitNode(sf, visitor);
      };

      return transformer;
    };
  }

  transpile(): TranspileOutput {
    const program = this._programManager.program;

    // Capture text and sourcemap via a custom writeFile function.
    let outputText: string;
    let sourceMapText: string;

    const writeFile = (fileName: string, data: string) => {
      if (path.extname(fileName) === '.js') {
        if (outputText !== undefined) {
          // This really shouldn't happen, so error out if it does.
          throw new Error(`Double JS emit for ${this._fileName}.`);
        }
        outputText = data;
      } else if (path.extname(fileName) === '.map') {
        sourceMapText = data;
      }
    };

    /**
     * There are currently two severe bugs affecting transforms:
     * - Before transforms break with decorated class constructor parameters
     * (https://github.com/Microsoft/TypeScript/issues/17551)
     * - Imports made unused are not dropped (https://github.com/Microsoft/TypeScript/issues/17552)
     * The first breaks compilation, the second retains extra imports like the compiler.
     */
    const { emitSkipped } = program.emit(
      this._sourceFile, writeFile, undefined, undefined,
      { before: [this._getTransform()] }
    );

    if (emitSkipped) {
      throw new Error(`${this._fileName} emit failed.`);
    }

    if (outputText === undefined) {
      // Something went wrong in reading the emitted file;
      throw new Error(`Could not retrieve emitted TypeScript for ${this._fileName}.`);
    }

    if (sourceMapText !== undefined) {
      const sourceMap = JSON.parse(sourceMapText);
      const fileName = this._fileName.replace(/\//g, path.sep);
      sourceMap.file = path.basename(fileName, '.ts') + '.js';
      sourceMap.sources = [fileName];
      sourceMap.sourcesContent = [this._host.readFile(this._fileName)];

      return {
        outputText,
        sourceMap: sourceMap
      };
    } else {
      return {
        outputText,
        sourceMap: null
      };
    }
  }
}
