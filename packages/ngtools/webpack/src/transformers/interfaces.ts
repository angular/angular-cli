/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';

export enum OPERATION_KIND {
  Remove,
  Add,
  Replace,
}

export interface StandardTransform {
  (sourceFile: ts.SourceFile): TransformOperation[];
}

export abstract class TransformOperation {
  constructor(
    public kind: OPERATION_KIND,
    public sourceFile: ts.SourceFile,
    public target: ts.Node,
  ) { }
}

export class RemoveNodeOperation extends TransformOperation {
  constructor(sourceFile: ts.SourceFile, target: ts.Node) {
    super(OPERATION_KIND.Remove, sourceFile, target);
  }
}

export class AddNodeOperation extends TransformOperation {
  constructor(sourceFile: ts.SourceFile, target: ts.Node,
              public before?: ts.Node, public after?: ts.Node) {
    super(OPERATION_KIND.Add, sourceFile, target);
  }
}

export class ReplaceNodeOperation extends TransformOperation {
  kind: OPERATION_KIND.Replace;
  constructor(sourceFile: ts.SourceFile, target: ts.Node, public replacement: ts.Node) {
    super(OPERATION_KIND.Replace, sourceFile, target);
  }
}
