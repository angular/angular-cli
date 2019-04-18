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
    'ng-update'?: {
      migrations?: string;
    };
  };
  children: PackageTreeNode[];
}

export interface PackageTreeActual extends PackageTreeNodeBase {
  isLink: false;
  parent?: PackageTreeActual;
}

export interface PackageTreeLink extends PackageTreeNodeBase {
  isLink: true;
  parent: null;
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

export function findNodeDependencies(root: PackageTreeNode, node = root) {
  const actual = node.isLink ? node.target : node;

  const rawDeps: Record<string, string> = {
    ...actual.package.dependencies,
    ...actual.package.devDependencies,
    ...actual.package.peerDependencies,
  };

  return Object.entries(rawDeps).reduce(
    (deps, [name, version]) => {
      const depNode = root.children.find(child => {
        return child.name === name && !child.isLink && child.parent === node;
      }) as PackageTreeActual | undefined;

      deps[name] = depNode || version;

      return deps;
    },
    {} as Record<string, string | PackageTreeActual | undefined>,
  );
}
