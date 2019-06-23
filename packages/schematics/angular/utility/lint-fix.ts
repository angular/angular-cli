/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { NormalizedSep, normalize, relative } from '@angular-devkit/core';
import {
  DirEntry,
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
} from '@angular-devkit/schematics';
import { TslintFixTask } from '@angular-devkit/schematics/tasks';
import { isAbsolute } from 'path';

export function applyLintFix(path = '/'): Rule {
  return (tree: Tree, context: SchematicContext) => {
    if (!isAbsolute(path)) {
      path = NormalizedSep + path;
    }

    // Find the closest tslint.json or tslint.yaml
    let dir: DirEntry | null = tree.getDir(path.substr(0, path.lastIndexOf('/')));

    do {
      if ((dir.subfiles as string[]).some(f => f === 'tslint.json' || f === 'tslint.yaml')) {
        break;
      }

      dir = dir.parent;
    } while (dir !== null);

    if (dir === null) {
      throw new SchematicsException(
        'Asked to run lint fixes, but could not find a tslint.json or tslint.yaml config file.');
    }

    // Only include files that have been touched.
    const files = tree.actions.reduce((acc: Set<string>, action) => {
      if (action.path.endsWith('.ts') && dir && action.path.startsWith(dir.path)) {
          acc.add(relative(normalize(path), action.path));
      }

      return acc;
    }, new Set<string>());

    context.addTask(new TslintFixTask({
      ignoreErrors: true,
      tsConfigPath: 'tsconfig.json',
      files: [...files],
    }));
  };
}
