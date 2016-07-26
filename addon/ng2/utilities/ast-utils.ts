import * as ts from 'typescript';
import { InsertChange } from './change';

/**
* Find all nodes from the AST in the subtree of node of SyntaxKind kind.
* @param node 
* @param kind
* @return all nodes of kind kind, or [] if none is found
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
