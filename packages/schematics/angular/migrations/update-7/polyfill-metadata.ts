/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Rule, Tree, chain } from '@angular-devkit/schematics';
import * as ts from '../../third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { getWorkspace } from '../../utility/workspace';
import { Builders } from '../../utility/workspace-models';

/**
 * Remove the Reflect import from a polyfill file.
 * @param tree The tree to use.
 * @param path Path of the polyfill file found.
 * @private
 */
function _removeReflectFromPolyfills(tree: Tree, path: string) {
  const source = tree.read(path);
  if (!source) {
    return;
  }

  // Start the update of the file.
  const recorder = tree.beginUpdate(path);

  const sourceFile = ts.createSourceFile(path, source.toString(), ts.ScriptTarget.Latest);
  const imports = sourceFile.statements.filter(ts.isImportDeclaration);

  for (const i of imports) {
    const module = ts.isStringLiteral(i.moduleSpecifier) && i.moduleSpecifier.text;

    switch (module) {
      case 'core-js/es7/reflect':
        recorder.remove(i.getFullStart(), i.getFullWidth());
        break;
    }
  }

  tree.commitUpdate(recorder);
}

export function polyfillMetadataRule(): Rule {
  return async (tree) => {
    const workspace = await getWorkspace(tree);

    const rules: Rule[] = [];
    for (const [, project] of workspace.projects) {
      if (typeof project.root !== 'string') {
        continue;
      }

      for (const [, target] of project.targets) {
        if (target.builder !== Builders.Browser) {
          continue;
        }

        const optionPolyfills = target.options?.polyfills;
        if (optionPolyfills && typeof optionPolyfills === 'string') {
          rules.push((tree) => _removeReflectFromPolyfills(tree, optionPolyfills));
        }

        if (!target.configurations) {
          continue;
        }

        for (const configuration of Object.values(target.configurations)) {
          const configurationPolyfills = configuration?.polyfills;
          if (configurationPolyfills && typeof configurationPolyfills === 'string') {
            rules.push((tree) => _removeReflectFromPolyfills(tree, configurationPolyfills));
          }
        }
      }
    }

    return chain(rules);
  };
}
