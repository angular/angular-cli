import * as fs from 'fs';
import * as glob from 'glob';
import * as path from 'path';
import * as ts from 'typescript';

import {getSource, findNodes, getContentOfKeyLiteral} from '../utilities/ast-utils';


function flatMap<T, R>(obj: Array<T>, mapFn: (item: T) => R | R[]): Array<R> {
  return obj.reduce((arr: R[], current: T) => {
    const result = mapFn.call(null, current);
    return result !== undefined ? arr.concat(result) : arr;
  }, <R[]>[]);
}


export function findLoadChildren(tsFilePath: string): string[] {
  const source = getSource(tsFilePath);
  const unique: { [path: string]: boolean } = {};

  let nodes = flatMap(
    findNodes(source, ts.SyntaxKind.ObjectLiteralExpression),
    node => findNodes(node, ts.SyntaxKind.PropertyAssignment))
      .filter((node: ts.PropertyAssignment) => {
        const key = getContentOfKeyLiteral(source, node.name);
        if (!key) {
          // key is an expression, can't do anything.
          return false;
        }
        return key == 'loadChildren';
      })
      // Remove initializers that are not files.
      .filter((node: ts.PropertyAssignment) => {
        return node.initializer.kind === ts.SyntaxKind.StringLiteral;
      })
      // Get the full text of the initializer.
      .map((node: ts.PropertyAssignment) => {
        return JSON.parse(node.initializer.getText(source)); // tslint:disable-line
      });

  return nodes
    .filter((value: string) => {
      if (unique[value]) {
        return false;
      } else {
        unique[value] = true;
        return true;
      }
    })
    .map((moduleName: string) => moduleName.split('#')[0]);
}


export function findLazyModules(projectRoot: any): string[] {
  const result: {[key: string]: boolean} = {};
  glob.sync(path.join(projectRoot, '/**/*.ts'))
    .forEach(tsPath => {
      findLoadChildren(tsPath).forEach(moduleName => {
        const fileName = path.resolve(path.dirname(tsPath), moduleName) + '.ts';
        if (fs.existsSync(fileName)) {
          result[moduleName] = true;
        }
      });
    });
  return Object.keys(result);
}
