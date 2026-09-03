/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { Rule } from '@angular-devkit/schematics';
import { Visitor, parseSync } from 'oxc-parser';
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

      const parseResult = parseSync(path, content, {
        sourceType: 'module',
      });

      if (parseResult.errors.length > 0) {
        continue;
      }

      const recorder = tree.beginUpdate(path);

      const visitor = new Visitor({
        NewExpression(node) {
          if (
            node.callee.type === 'Identifier' &&
            (node.callee.name === 'AngularNodeAppEngine' || node.callee.name === 'AngularAppEngine')
          ) {
            // Check arguments
            if (!node.arguments || node.arguments.length === 0) {
              // Case 1: No arguments passed
              const hasParens = content[node.end - 1] === ')';
              const insertPos = hasParens ? node.end - 1 : node.end;
              recorder.insertRight(
                insertPos,
                hasParens
                  ? `{\n  ${TODO_COMMENT}\n  ` +
                      `trustProxyHeaders: ['x-forwarded-host', 'x-forwarded-proto'],\n}`
                  : `({\n  ${TODO_COMMENT}\n  ` +
                      `trustProxyHeaders: ['x-forwarded-host', 'x-forwarded-proto'],\n})`,
              );
            } else if (node.arguments.length > 0) {
              const firstArg = node.arguments[0];
              if (firstArg.type === 'ObjectExpression') {
                // Check if trustProxyHeaders is already present
                const hasTrustProxyHeaders = firstArg.properties.some(
                  (prop) =>
                    prop.type === 'Property' &&
                    ((!prop.computed &&
                      prop.key.type === 'Identifier' &&
                      prop.key.name === 'trustProxyHeaders') ||
                      (prop.key.type === 'Literal' && prop.key.value === 'trustProxyHeaders')),
                );

                if (!hasTrustProxyHeaders) {
                  // Insert right after the opening brace
                  const insertPos = firstArg.start + 1;
                  recorder.insertRight(
                    insertPos,
                    `\n  ${TODO_COMMENT}\n  ` +
                      `trustProxyHeaders: ['x-forwarded-host', 'x-forwarded-proto'],`,
                  );
                }
              }
            }
          }
        },
      });

      visitor.visit(parseResult.program);

      tree.commitUpdate(recorder);
    }
  };
}
