import * as fs from 'fs';
import * as glob from 'glob';
import * as path from 'path';
import * as ts from 'typescript';

import {Observable} from 'rxjs/Observable';
import {getSource, findNodes, getContentOfKeyLiteral} from '../utilities/ast-utils';


const loadChildrenRegex = /(\{[^{}]+?(loadChildren|['"]loadChildren['"])\s*:\s*)('[^']+'|"[^"]+")/gm;


interface Array<T> {
  flatMap: <R>(mapFn: (item: T) => Array<R>) => Array<R>;
}
Array.prototype.flatMap = function<T, R>(mapFn: (item: T) => Array<R>): Array<R> {
  if (!mapFn) {
    return [];
  }

  return this.reduce((arr, current) => {
    const result = mapFn.call(null, current);
    return result !== undefined ? arr.concat(result) : arr;
  }, []);
};


export function findLoadChildren(tsFilePath: string): string[] {
  const source = getSource(tsFilePath);
  const unique = {};

  return findNodes(source, ts.SyntaxKind.ObjectLiteralExpression)
    .flatMap(node => findNodes(node, ts.SyntaxKind.PropertyAssignment))
    .filter((node: ts.PropertyAssignment) => {
      const key = getContentOfKeyLiteral(source, node.name);
      if (!key) {
        // key is an expression, can't do anything.
        return false;
      }
      return key == 'loadChildren'
    })
    // Remove initializers that are not files.
    .filter((node: ts.PropertyAssignment) => {
      return node.initializer.kind === ts.SyntaxKind.StringLiteral;
    })
    // Get the full text of the initiliazer.
    .map((node: ts.PropertyAssignment) => {
      return eval(node.initializer.getText(source));
    })
    .flatMap((value: string) => unique[value] ? undefined : unique[value] = value)
    .map((moduleName: string) => moduleName.split('#')[0]);
}


export function findLazyModules(projectRoot: any): string[] {
  const allTs = glob.sync(path.join(projectRoot, '/**/*.ts'));
  const result = {};
  allTs
    .flatMap(tsPath => {
      findLoadChildren(tsPath).forEach(moduleName => {
        const fileName = path.resolve(path.dirname(tsPath), moduleName) + '.ts';
        if (fs.existsSync(fileName)) {
          result[moduleName] = fileName;
        }
      });
    });
  return result;
}
