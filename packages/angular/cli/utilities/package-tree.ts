/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export interface PackageTreeNodeBase {
  name: string;
  path: string;
  realpath: string;
  error?: Error;
  id: number;
  isLink: boolean;
  package: {
    name: string;
    version: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
    'ng-update'?: {
      migrations?: string;
    };
  };
  parent?: PackageTreeNode;
  children: PackageTreeNode[];
}

export interface PackageTreeActual extends PackageTreeNodeBase {
  isLink: false;
}

export interface PackageTreeLink extends PackageTreeNodeBase {
  isLink: true;
  target: PackageTreeActual;
}

export type PackageTreeNode = PackageTreeActual | PackageTreeLink;

export function readPackageTree(path: string): Promise<PackageTreeNode> {
  const rpt = require('read-package-tree');

  return new Promise((resolve, reject) => {
    rpt(path, (e: Error | undefined, data: PackageTreeNode) => {
      if (e) {
        reject(e);
      } else {
        resolve(data);
      }
    });
  });
}

export interface NodeDependency {
  version: string;
  node?: PackageTreeNode;
}

export function findNodeDependencies(node: PackageTreeNode) {
  const rawDeps: Record<string, string> = {
    ...node.package.dependencies,
    ...node.package.devDependencies,
    ...node.package.peerDependencies,
    ...node.package.optionalDependencies,
  };

  return Object.entries(rawDeps).reduce(
    (deps, [name, version]) => {
      let dependencyNode;
      let parent: PackageTreeNode | undefined | null = node;
      while (!dependencyNode && parent) {
        dependencyNode = parent.children.find(child => child.name === name);
        parent = parent.parent;
      }

      deps[name] = {
        node: dependencyNode,
        version,
      };

      return deps;
    },
    Object.create(null) as Record<string, NodeDependency>,
  );
}
