/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Rule } from '@angular-devkit/schematics';
import ts from 'typescript';
import { allTargetOptions, allWorkspaceTargets, getWorkspace } from '../../utility/workspace';

const TODO_COMMENT =
  '// TODO: This is a security-sensitive option. Remove if not needed. ' +
  'For more information, see https://angular.dev/best-practices/security#configuring-trusted-proxy-headers';

export default function (): Rule {
  return async (tree) => {
    const workspace = await getWorkspace(tree);
    const serverFiles = new Set<string>();

    for (const [targetName, target] of allWorkspaceTargets(workspace)) {
      if (targetName !== 'build') {
        continue;
      }

      for (const [, options] of allTargetOptions(target)) {
        if (typeof options?.['server'] === 'string') {
          serverFiles.add(options['server']);
        }
      }
    }

    for (const path of serverFiles) {
      if (!tree.exists(path)) {
        continue;
      }

      const content = tree.readText(path);
      if (content.includes(TODO_COMMENT)) {
        continue;
      }

      if (!content.includes('AngularAppEngine') && !content.includes('AngularNodeAppEngine')) {
        continue;
      }

      const sourceFile = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true);
      const recorder = tree.beginUpdate(path);

      function visit(node: ts.Node) {
        if (
          ts.isNewExpression(node) &&
          ts.isIdentifier(node.expression) &&
          (node.expression.text === 'AngularNodeAppEngine' ||
            node.expression.text === 'AngularAppEngine')
        ) {
          // Check arguments
          if (!node.arguments || node.arguments.length === 0) {
            // Case 1: No arguments passed
            const insertPos = node.end - 1; // right before )
            recorder.insertRight(
              insertPos,
              `{\n  ${TODO_COMMENT}\n  ` +
                `trustProxyHeaders: ['x-forwarded-host', 'x-forwarded-proto'],\n}`,
            );
          } else if (node.arguments.length > 0) {
            const firstArg = node.arguments[0];
            if (ts.isObjectLiteralExpression(firstArg)) {
              // Check if trustProxyHeaders is already present
              const hasTrustProxyHeaders = firstArg.properties.some(
                (prop: ts.ObjectLiteralElementLike) =>
                  ts.isPropertyAssignment(prop) &&
                  (ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name)) &&
                  prop.name.text === 'trustProxyHeaders',
              );

              if (!hasTrustProxyHeaders) {
                // Insert right after the opening brace
                const insertPos = firstArg.getStart() + 1;
                recorder.insertRight(
                  insertPos,
                  `\n  ${TODO_COMMENT}\n  ` +
                    `trustProxyHeaders: ['x-forwarded-host', 'x-forwarded-proto'],`,
                );
              }
            }
          }
        }
        ts.forEachChild(node, visit);
      }

      visit(sourceFile);
      tree.commitUpdate(recorder);
    }
  };
}
