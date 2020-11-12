/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';

import { PLATFORM } from '../interfaces';

export function replaceIsPlatformCalls(platform: PLATFORM): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext) => (sourceFile: ts.SourceFile) => {
    const visitCallExpression: ts.Visitor = (node: ts.Node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        // If it's a call expression like `isPlatformServer(platformId)`.
        if (node.expression.escapedText === 'isPlatformServer') {
          // If Webpack bundles assets for the browser platform then we just
          // replace `isPlatformServer()` with `true` and vice versa with `false` for the server platform.
          return platform === PLATFORM.Server ? ts.factory.createTrue() : ts.factory.createFalse();
        } else if (node.expression.escapedText === 'isPlatformBrowser') {
          // If Webpack bundles assets for the browser platform then we just
          // replace `isPlatformBrowser()` with `true` and vice versa with `false` for the server platform.
          return platform === PLATFORM.Browser ? ts.factory.createTrue() : ts.factory.createFalse();
        }
      }

      return ts.visitEachChild(node, visitCallExpression, context);
    };

    return ts.visitEachChild(sourceFile, visitCallExpression, context);
  };
}
