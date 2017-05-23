import * as ts from 'typescript';
import {Change, NoopChange} from './change';
import {findNodes, insertAfterLastOccurrence} from './ast-utils';



/**
* Add Import `import { symbolName } from fileName` if the import doesn't exit
* already. Assumes fileToEdit can be resolved and accessed.
* @param fileToEdit (file we want to add import to)
* @param symbolName (item to import)
* @param fileName (path to the file)
* @param isDefault (if true, import follows style for importing default exports)
* @return Change
*/

export function insertImport(source: ts.SourceFile, fileToEdit: string, symbolName: string,
                                  fileName: string, isDefault = false): Change {
  let rootNode = source;
  let allImports = findNodes(rootNode, ts.SyntaxKind.ImportDeclaration);

  // get nodes that map to import statements from the file fileName
  let relevantImports = allImports.filter(node => {
    // StringLiteral of the ImportDeclaration is the import file (fileName in this case).
    let importFiles = node.getChildren().filter(child => child.kind === ts.SyntaxKind.StringLiteral)
                      .map(n => (<ts.StringLiteral>n).text);
    return importFiles.filter(file => file === fileName).length === 1;
  });

  if (relevantImports.length > 0) {

    let importsAsterisk = false;
    // imports from import file
    let imports: ts.Node[] = [];
    relevantImports.forEach(n => {
      Array.prototype.push.apply(imports, findNodes(n, ts.SyntaxKind.Identifier));
      if (findNodes(n, ts.SyntaxKind.AsteriskToken).length > 0) {
        importsAsterisk = true;
      }
    });

    // if imports * from fileName, don't add symbolName
    if (importsAsterisk) {
      return new NoopChange();
    }

    let importTextNodes = imports.filter(n => (<ts.Identifier>n).text === symbolName);

    // insert import if it's not there
    if (importTextNodes.length === 0) {
      let fallbackPos = findNodes(relevantImports[0], ts.SyntaxKind.CloseBraceToken)[0].pos ||
                        findNodes(relevantImports[0], ts.SyntaxKind.FromKeyword)[0].pos;
      return insertAfterLastOccurrence(imports, `, ${symbolName}`, fileToEdit, fallbackPos);
    }
    return new NoopChange();
  }

  // no such import declaration exists
  let useStrict = findNodes(rootNode, ts.SyntaxKind.StringLiteral)
                  .filter((n: ts.StringLiteral) => n.text === 'use strict');
  let fallbackPos = 0;
  if (useStrict.length > 0) {
    fallbackPos = useStrict[0].end;
  }
  let open = isDefault ? '' : '{ ';
  let close = isDefault ? '' : ' }';
  // if there are no imports or 'use strict' statement, insert import at beginning of file
  let insertAtBeginning = allImports.length === 0 && useStrict.length === 0;
  let separator = insertAtBeginning ? '' : ';\n';
  let toInsert = `${separator}import ${open}${symbolName}${close}` +
    ` from '${fileName}'${insertAtBeginning ? ';\n' : ''}`;
  return insertAfterLastOccurrence(
    allImports,
    toInsert,
    fileToEdit,
    fallbackPos,
    ts.SyntaxKind.StringLiteral
  );
}

