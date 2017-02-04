import * as ts from 'typescript';
import * as fs from 'fs';
import {Symbols} from '@angular/tsc-wrapped/src/symbols';
import {
  isMetadataImportedSymbolReferenceExpression,
  isMetadataModuleReferenceExpression
} from '@angular/tsc-wrapped';
import {Change, InsertChange, NoopChange, MultiChange} from './change';
import {findNodes} from './node';
import {insertImport} from './route-utils';

import {Observable} from 'rxjs/Observable';
import {ReplaySubject} from 'rxjs/ReplaySubject';
import 'rxjs/add/observable/empty';
import 'rxjs/add/observable/of';
import 'rxjs/add/operator/do';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/last';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/toArray';
import 'rxjs/add/operator/toPromise';


/**
* Get TS source file based on path.
* @param filePath
* @return source file of ts.SourceFile kind
*/
export function getSource(filePath: string): ts.SourceFile {
  return ts.createSourceFile(filePath, fs.readFileSync(filePath).toString(),
    ts.ScriptTarget.Latest, true);
}


/**
 * Get all the nodes from a source, as an observable.
 * @param sourceFile The source file object.
 * @returns {Observable<ts.Node>} An observable of all the nodes in the source.
 */
export function getSourceNodes(sourceFile: ts.SourceFile): Observable<ts.Node> {
  const subject = new ReplaySubject<ts.Node>();
  let nodes: ts.Node[] = [sourceFile];

  while (nodes.length > 0) {
    const node = nodes.shift();

    if (node) {
      subject.next(node);
      if (node.getChildCount(sourceFile) >= 0) {
        nodes.unshift(...node.getChildren());
      }
    }
  }

  subject.complete();
  return subject.asObservable();
}


/**
 * Helper for sorting nodes.
 * @return function to sort nodes in increasing order of position in sourceFile
 */
function nodesByPosition(first: ts.Node, second: ts.Node): number {
  return first.pos - second.pos;
}


/**
 * Insert `toInsert` after the last occurence of `ts.SyntaxKind[nodes[i].kind]`
 * or after the last of occurence of `syntaxKind` if the last occurence is a sub child
 * of ts.SyntaxKind[nodes[i].kind] and save the changes in file.
 *
 * @param nodes insert after the last occurence of nodes
 * @param toInsert string to insert
 * @param file file to insert changes into
 * @param fallbackPos position to insert if toInsert happens to be the first occurence
 * @param syntaxKind the ts.SyntaxKind of the subchildren to insert after
 * @return Change instance
 * @throw Error if toInsert is first occurence but fall back is not set
 */
export function insertAfterLastOccurrence(nodes: ts.Node[], toInsert: string,
    file: string, fallbackPos?: number, syntaxKind?: ts.SyntaxKind): Change {
  let lastItem = nodes.sort(nodesByPosition).pop();
  if (syntaxKind) {
    lastItem = findNodes(lastItem, syntaxKind).sort(nodesByPosition).pop();
  }
  if (!lastItem && fallbackPos == undefined) {
    throw new Error(`tried to insert ${toInsert} as first occurence with no fallback position`);
  }
  let lastItemPosition: number = lastItem ? lastItem.end : fallbackPos;
  return new InsertChange(file, lastItemPosition, toInsert);
}


export function getContentOfKeyLiteral(source: ts.SourceFile, node: ts.Node): string {
  if (node.kind == ts.SyntaxKind.Identifier) {
    return (node as ts.Identifier).text;
  } else if (node.kind == ts.SyntaxKind.StringLiteral) {
    return (node as ts.StringLiteral).text;
  } else {
    return null;
  }
}


export function getDecoratorMetadata(source: ts.SourceFile, identifier: string,
                                     module: string): Observable<ts.Node> {
  const symbols = new Symbols(source as any);

  return getSourceNodes(source)
    .filter(node => {
      return node.kind == ts.SyntaxKind.Decorator
          && (<ts.Decorator>node).expression.kind == ts.SyntaxKind.CallExpression;
    })
    .map(node => <ts.CallExpression>(<ts.Decorator>node).expression)
    .filter(expr => {
      if (expr.expression.kind == ts.SyntaxKind.Identifier) {
        const id = <ts.Identifier>expr.expression;
        const metaData = symbols.resolve(id.getFullText(source));
        if (isMetadataImportedSymbolReferenceExpression(metaData)) {
          return metaData.name == identifier && metaData.module == module;
        }
      } else if (expr.expression.kind == ts.SyntaxKind.PropertyAccessExpression) {
        // This covers foo.NgModule when importing * as foo.
        const paExpr = <ts.PropertyAccessExpression>expr.expression;
        // If the left expression is not an identifier, just give up at that point.
        if (paExpr.expression.kind !== ts.SyntaxKind.Identifier) {
          return false;
        }

        const id = paExpr.name;
        const moduleId = <ts.Identifier>paExpr.expression;
        const moduleMetaData = symbols.resolve(moduleId.getFullText(source));
        if (isMetadataModuleReferenceExpression(moduleMetaData)) {
          return moduleMetaData.module == module && id.getFullText(source) == identifier;
        }
      }
      return false;
    })
    .filter(expr => expr.arguments[0]
                 && expr.arguments[0].kind == ts.SyntaxKind.ObjectLiteralExpression)
    .map(expr => <ts.ObjectLiteralExpression>expr.arguments[0]);
}


function _addSymbolToNgModuleMetadata(ngModulePath: string, metadataField: string,
                                      symbolName: string, importPath: string) {
  const source: ts.SourceFile = getSource(ngModulePath);
  let metadata = getDecoratorMetadata(source, 'NgModule', '@angular/core');

  // Find the decorator declaration.
  return metadata
    .toPromise()
    .then((node: ts.ObjectLiteralExpression) => {
      if (!node) {
        return null;
      }

      // Get all the children property assignment of object literals.
      return node.properties
        .filter(prop => prop.kind == ts.SyntaxKind.PropertyAssignment)
        // Filter out every fields that's not "metadataField". Also handles string literals
        // (but not expressions).
        .filter((prop: ts.PropertyAssignment) => {
          const name = prop.name;
          switch (name.kind) {
            case ts.SyntaxKind.Identifier:
              return (name as ts.Identifier).getText(source) == metadataField;
            case ts.SyntaxKind.StringLiteral:
              return (name as ts.StringLiteral).text == metadataField;
          }

          return false;
        });
    })
    // Get the last node of the array literal.
    .then((matchingProperties: ts.ObjectLiteralElement[]): any => {
      if (!matchingProperties) {
        return null;
      }
      if (matchingProperties.length == 0) {
        return metadata.toPromise();
      }

      const assignment = <ts.PropertyAssignment>matchingProperties[0];

      // If it's not an array, nothing we can do really.
      if (assignment.initializer.kind !== ts.SyntaxKind.ArrayLiteralExpression) {
        return null;
      }

      const arrLiteral = <ts.ArrayLiteralExpression>assignment.initializer;
      if (arrLiteral.elements.length == 0) {
        // Forward the property.
        return arrLiteral;
      }
      return arrLiteral.elements;
    })
    .then((node: ts.Node) => {
      if (!node) {
        /* eslint-disable no-console */
        console.log('No app module found. Please add your new class to your component.');
        return new NoopChange();
      }
      if (Array.isArray(node)) {
        node = node[node.length - 1];
      }

      let toInsert: string;
      let position = node.getEnd();
      if (node.kind == ts.SyntaxKind.ObjectLiteralExpression) {
        // We haven't found the field in the metadata declaration. Insert a new
        // field.
        let expr = <ts.ObjectLiteralExpression>node;
        if (expr.properties.length == 0) {
          position = expr.getEnd() - 1;
          toInsert = `  ${metadataField}: [${symbolName}]\n`;
        } else {
          node = expr.properties[expr.properties.length - 1];
          position = node.getEnd();
          // Get the indentation of the last element, if any.
          const text = node.getFullText(source);
          if (text.match('^\r?\r?\n')) {
            toInsert = `,${text.match(/^\r?\n\s+/)[0]}${metadataField}: [${symbolName}]`;
          } else {
            toInsert = `, ${metadataField}: [${symbolName}]`;
          }
        }
      } else if (node.kind == ts.SyntaxKind.ArrayLiteralExpression) {
        // We found the field but it's empty. Insert it just before the `]`.
        position--;
        toInsert = `${symbolName}`;
      } else {
        // Get the indentation of the last element, if any.
        const text = node.getFullText(source);
        if (text.match(/^\r?\n/)) {
          toInsert = `,${text.match(/^\r?\n(\r?)\s+/)[0]}${symbolName}`;
        } else {
          toInsert = `, ${symbolName}`;
        }
      }

      const insert = new InsertChange(ngModulePath, position, toInsert);
      const importInsert: Change = insertImport(
        ngModulePath, symbolName.replace(/\..*$/, ''), importPath);
      return new MultiChange([insert, importInsert]);
    });
}

/**
* Custom function to insert a declaration (component, pipe, directive)
* into NgModule declarations. It also imports the component.
*/
export function addDeclarationToModule(modulePath: string, classifiedName: string,
                                       importPath: string): Promise<Change> {

  return _addSymbolToNgModuleMetadata(modulePath, 'declarations', classifiedName, importPath);
}

/**
 * Custom function to insert a declaration (component, pipe, directive)
 * into NgModule declarations. It also imports the component.
 */
export function addImportToModule(modulePath: string, classifiedName: string,
                                  importPath: string): Promise<Change> {

  return _addSymbolToNgModuleMetadata(modulePath, 'imports', classifiedName, importPath);
}

/**
 * Custom function to insert a provider into NgModule. It also imports it.
 */
export function addProviderToModule(modulePath: string, classifiedName: string,
                                    importPath: string): Promise<Change> {
  return _addSymbolToNgModuleMetadata(modulePath, 'providers', classifiedName, importPath);
}

/**
 * Custom function to insert an export into NgModule. It also imports it.
 */
export function addExportToModule(modulePath: string, classifiedName: string,
                                    importPath: string): Promise<Change> {
  return _addSymbolToNgModuleMetadata(modulePath, 'exports', classifiedName, importPath);
}

