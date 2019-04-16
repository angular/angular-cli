/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  Rule,
  SchematicContext,
  Tree,
} from '@angular-devkit/schematics';
import {
  TslintFixTask,
} from '@angular-devkit/schematics/tasks';
import * as path from 'path';

export const updateLazyModulePaths = (): Rule => {
  return (_: Tree, context: SchematicContext) => {
    context.addTask(new TslintFixTask({
      rulesDirectory: path.join(__dirname, 'rules'),
      rules: {
        'no-lazy-module-paths': [true],
      },
    }, {
      includes: '**/*.ts',
      silent: false,
    }));
  };
};
