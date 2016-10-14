import * as fs from 'fs';
import * as glob from 'glob';
import * as path from 'path';
import * as ts from 'typescript';
const resolve = require('resolve');

import {getSource, findNodes, getContentOfKeyLiteral} from '../utilities/ast-utils';


export function findLoadChildren(tsFilePath: string): string[] {
  const source = getSource(tsFilePath);
  const unique: { [path: string]: boolean } = {};

  return (
    // Find all object literals.
    findNodes(source, ts.SyntaxKind.ObjectLiteralExpression)
    // Get all their property assignments.
    .map(node => findNodes(node, ts.SyntaxKind.PropertyAssignment))
    // Flatten into a single array (from an array of array<property assignments>).
    .reduce((prev, curr) => curr ? prev.concat(curr) : prev, [])
    // Remove every property assignment that aren't 'loadChildren'.
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
      const literal = node.initializer as ts.StringLiteral;
      return literal.text;
    })
    // Map to the module name itself.
    .map((moduleName: string) => moduleName.split('#')[0])
    // Only get unique values (there might be multiple modules from a single URL, or a module used
    // multiple times).
    .filter((value: string) => {
      if (unique[value]) {
        return false;
      } else {
        unique[value] = true;
        return true;
      }
    }));
}

export function findLazyModules(projectRoot: any): {[key: string]: string} {
  const result: {[key: string]: string} = {};
  glob.sync(path.join(projectRoot, '/**/*.ts'))
    .forEach(tsPath => {
      findLoadChildren(tsPath).forEach(moduleName => {
        let fileName = moduleName.startsWith('.')
          ? path.resolve(path.dirname(tsPath), moduleName) + '.ts'
          : path.resolve(projectRoot, moduleName) + '.ts';

        if (fs.existsSync(fileName)) {
          // Put the moduleName as relative to the main.ts.
          result[moduleName] = fileName;
        } else {
          try {
            let res = resolve.sync(moduleName, { basedir: projectRoot });
            if (res) {
              result[moduleName] = res;
            }
          } catch (e) {
          }
        }
      });
    });
  return result;
}
