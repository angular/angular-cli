import * as ts from 'typescript';
import { AbstractTransformer } from './transformer';


export class AngularDecoratorRemover extends AbstractTransformer {

  transform(sourceFile: ts.SourceFile): ts.SourceFile {
    let decoratorsRemoved = false;

    const visitor: ts.Visitor = node => {
      if (ts.isDecorator(node) && this.shouldRemove(node)) {
        decoratorsRemoved = true;
        return undefined;
      }

      return this.visitEachChild(node, visitor);
    };

    const result = this.visitEachChild(sourceFile, visitor);

    // cleanup decorators if modifications were made
    if (decoratorsRemoved) {
      this.cleanupDecorators(result);
    }

    return result;
  }

  private shouldRemove(decorator: ts.Decorator): boolean {
    const origin = this.getDecoratorOrigin(decorator);

    return origin && origin.module === '@angular/core';
  }

  // Workaround TS bug with empty decorator arrays
  private cleanupDecorators(node: ts.Node) {
    if (node.decorators && node.decorators.length == 0) {
      node.decorators = undefined;
    }

    ts.forEachChild(node, node => this.cleanupDecorators(node));
  }

}
