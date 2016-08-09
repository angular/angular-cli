import * as ts from 'typescript';
import * as fs from 'fs';
import { InsertChange } from './change';

/**
* Get TS source file based on path.
* @param filePath
* @return source file of ts.SourceFile kind
*/
export function getSource(filePath: string): ts.SourceFile {
  return ts.createSourceFile(filePath, fs.readFileSync(filePath).toString(), 
    ts.ScriptTarget.ES6, true);
}

/**
* Find all nodes from the AST in the subtree of node of SyntaxKind kind.
* @param node 
* @param kind
* @return all nodes of kind, or [] if none is found
*/
export function findNodes(node: ts.Node, kind: ts.SyntaxKind): ts.Node[] {
  if (!node) {
    return [];
  }
  let arr: ts.Node[] = [];
  if (node.kind === kind) {
    arr.push(node);
  }
  return node.getChildren().reduce((foundNodes, child) =>
                                    foundNodes.concat(findNodes(child, kind)), arr);
}

/**
* Find all nodes from the AST in the subtree based on text.
* @param node 
* @param text
* @return all nodes of text, or [] if none is found
*/
export function findNodesByText(node: ts.Node, text: string): ts.Node[] {
  if (!node) {
    return [];
  }
  let arr: ts.Node[] = [];
  if (node.getText() === text) {
    arr.push(node);
  }

  return node.getChildren().reduce((foundNodes, child) => {
    return foundNodes.concat(findNodesByText(child, text));
  }, arr);
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
  var lastItem = nodes.sort(nodesByPosition).pop();
  if (syntaxKind) {
    lastItem = findNodes(lastItem, syntaxKind).sort(nodesByPosition).pop();
  }
  if (!lastItem && fallbackPos == undefined) {
    throw new Error(`tried to insert ${toInsert} as first occurence with no fallback position`);
  }
  let lastItemPosition: number = lastItem ? lastItem.end : fallbackPos;
  return new InsertChange(file, lastItemPosition, toInsert);
}

/**
* Custom function to insert component (component, pipe, directive)
* into NgModule declarations. It also imports the component. 
* @param modulePath
* @param classifiedName 
* @param importPath
* @return Promise
*/
export function importComponent(modulePath: string, classifiedName: string, 
    importPath: string): Promise<void> {
  let source: ts.SourceFile = this.getSource(modulePath);

  let importNode: ts.Node = 
    this.findNodesByText(source, 'import').pop();
  let iPos: ts.LineAndCharacter =
    source.getLineAndCharacterOfPosition(importNode.getEnd());
  let iLine: number = iPos.line + 1;
  let iStart: number = source.getPositionOfLineAndCharacter(iLine, 0);
  let iStr: string = `import { ${classifiedName} } from ${importPath}\n`;
  let changeImport: InsertChange = new InsertChange(modulePath, iStart, iStr);

  return changeImport.apply().then(() => {
    source = this.getSource(modulePath);
    let declarationsNode: ts.Node = 
      this.findNodesByText(source, 'declarations').shift();
    let dPos: ts.LineAndCharacter = 
      source.getLineAndCharacterOfPosition(declarationsNode.getEnd());
    let dStart: number = 
      source.getPositionOfLineAndCharacter(dPos.line + 1, -1);
    let dStr: string = `\n    ${classifiedName},`;
    let changeDeclarations: InsertChange = new InsertChange(modulePath, dStart, dStr);

    return changeDeclarations.apply();
  });
}

