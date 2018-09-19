/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonAstObject, JsonParseMode, parseJsonAst } from '@angular-devkit/core';
import { SchematicsException, Tree } from '@angular-devkit/schematics';
import {
  appendPropertyInAstObject,
  findPropertyInAstObject,
  insertPropertyInAstObjectInOrder,
 } from './json-utils';


const pkgJsonPath = '/package.json';
export enum NodeDependencyType {
  Default = 'dependencies',
  Dev = 'devDependencies',
  Peer = 'peerDependencies',
  Optional = 'optionalDependencies',
}

export interface NodeDependency {
  type: NodeDependencyType;
  name: string;
  version: string;
  overwrite?: boolean;
}

export function addPackageJsonDependency(tree: Tree, dependency: NodeDependency): void {
  const packageJsonAst = _readPackageJson(tree);
  const depsNode = findPropertyInAstObject(packageJsonAst, dependency.type);
  const recorder = tree.beginUpdate(pkgJsonPath);
  if (!depsNode) {
    // Haven't found the dependencies key, add it to the root of the package.json.
    appendPropertyInAstObject(recorder, packageJsonAst, dependency.type, {
      [dependency.name]: dependency.version,
    }, 2);
  } else if (depsNode.kind === 'object') {
    // check if package already added
    const depNode = findPropertyInAstObject(depsNode, dependency.name);

    if (!depNode) {
      // Package not found, add it.
      insertPropertyInAstObjectInOrder(
        recorder,
        depsNode,
        dependency.name,
        dependency.version,
        4,
      );
    } else if (dependency.overwrite) {
      // Package found, update version if overwrite.
      const { end, start } = depNode;
      recorder.remove(start.offset, end.offset - start.offset);
      recorder.insertRight(start.offset, JSON.stringify(dependency.version));
    }
  }

  tree.commitUpdate(recorder);
}

export function getPackageJsonDependency(tree: Tree, name: string): NodeDependency | null {
  const packageJson = _readPackageJson(tree);
  let dep: NodeDependency | null = null;
  [
    NodeDependencyType.Default,
    NodeDependencyType.Dev,
    NodeDependencyType.Optional,
    NodeDependencyType.Peer,
  ].forEach(depType => {
    if (dep !== null) {
      return;
    }
    const depsNode = findPropertyInAstObject(packageJson, depType);
    if (depsNode !== null && depsNode.kind === 'object') {
      const depNode = findPropertyInAstObject(depsNode, name);
      if (depNode !== null && depNode.kind === 'string') {
        const version = depNode.value;
        dep = {
          type: depType,
          name: name,
          version: version,
        };
      }
    }
  });

  return dep;
}

function _readPackageJson(tree: Tree): JsonAstObject {
  const buffer = tree.read(pkgJsonPath);
  if (buffer === null) {
    throw new SchematicsException('Could not read package.json.');
  }
  const content = buffer.toString();

  const packageJson = parseJsonAst(content, JsonParseMode.Strict);
  if (packageJson.kind != 'object') {
    throw new SchematicsException('Invalid package.json. Was expecting an object');
  }

  return packageJson;
}
