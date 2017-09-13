import * as ts from 'typescript';


export enum OPERATION_KIND {
  Remove,
  Add,
  Replace
}

export abstract class TransformOperation {
  constructor(
    public kind: OPERATION_KIND,
    public sourceFile: ts.SourceFile,
    public target: ts.Node
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

// TODO: add symbol workaround for https://github.com/Microsoft/TypeScript/issues/17551 and
// https://github.com/Microsoft/TypeScript/issues/17384

export function makeTransform(ops: TransformOperation[]): ts.TransformerFactory<ts.SourceFile> {

  const sourceFiles = ops.reduce((prev, curr) =>
    prev.includes(curr.sourceFile) ? prev : prev.concat(curr.sourceFile), []);

  const removeOps = ops.filter((op) => op.kind === OPERATION_KIND.Remove) as RemoveNodeOperation[];
  const addOps = ops.filter((op) => op.kind === OPERATION_KIND.Add) as AddNodeOperation[];
  const replaceOps = ops
    .filter((op) => op.kind === OPERATION_KIND.Replace) as ReplaceNodeOperation[];

  return (context: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {
    const transformer: ts.Transformer<ts.SourceFile> = (sf: ts.SourceFile) => {

      const visitor: ts.Visitor = (node) => {
        let modified = false;
        let modifiedNodes = [node];
        // Check if node should be dropped.
        if (removeOps.find((op) => op.target === node)) {
          modifiedNodes = [];
          modified = true;
        }

        // Check if node should be replaced (only replaces with first op found).
        const replace = replaceOps.find((op) => op.target === node);
        if (replace) {
          modifiedNodes = [replace.replacement];
          modified = true;
        }

        // Check if node should be added to.
        const add = addOps.filter((op) => op.target === node);
        if (add.length > 0) {
          modifiedNodes = [
            ...add.filter((op) => op.before).map(((op) => op.before)),
            ...modifiedNodes,
            ...add.filter((op) => op.after).map(((op) => op.after))
          ];
          modified = true;
        }

        // If we changed anything, return modified nodes without visiting further.
        if (modified) {
          return modifiedNodes;
        } else {
          // Otherwise return node as is and visit children.
          return ts.visitEachChild(node, visitor, context);
        }
      };

      // Only visit source files we have ops for.
      return sourceFiles.includes(sf) ? ts.visitNode(sf, visitor) : sf;
    };

    return transformer;
  };
}
