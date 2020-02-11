/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonAstObject } from '@angular-devkit/core';
import { Rule, UpdateRecorder } from '@angular-devkit/schematics';
import { getWorkspacePath } from '../../utility/config';
import { findPropertyInAstObject } from '../../utility/json-utils';
import { getWorkspace } from './utils';

export default function(): Rule {
  return tree => {
    const workspacePath = getWorkspacePath(tree);
    const workspace = getWorkspace(tree);
    const recorder = tree.beginUpdate(workspacePath);

    const rootSchematics = findSchematicsField(workspace);
    if (rootSchematics) {
      updateSchematicsField(rootSchematics, recorder);
    }

    const projects = findPropertyInAstObject(workspace, 'projects');
    if (!projects || projects.kind !== 'object' || !projects.properties) {
      return;
    }

    for (const { value } of projects.properties) {
      if (value.kind !== 'object') {
        continue;
      }

      const projectSchematics = findSchematicsField(value);
      if (!projectSchematics) {
        continue;
      }

      updateSchematicsField(projectSchematics, recorder);
    }

    tree.commitUpdate(recorder);

    return tree;
  };
}

function findSchematicsField(value: JsonAstObject): JsonAstObject | null {
  const schematics = findPropertyInAstObject(value, 'schematics');
  if (schematics && schematics.kind == 'object') {
    return schematics;
  }

  return null;
}

function updateSchematicsField(schematics: JsonAstObject, recorder: UpdateRecorder): void {
  for (const {
    key: { value: schematicName },
    value: schematicValue,
  } of schematics.properties) {
    if (schematicValue.kind !== 'object') {
      continue;
    }

    if (!schematicName.startsWith('@schematics/angular:')) {
      continue;
    }

    for (const { key: optionKey, value: optionValue } of schematicValue.properties) {
      if (optionKey.value === 'styleext') {
        // Rename `styleext` to `style
        const offset = optionKey.start.offset + 1;
        recorder.remove(offset, optionKey.value.length);
        recorder.insertLeft(offset, 'style');
      } else if (optionKey.value === 'spec') {
        // Rename `spec` to `skipTests`
        const offset = optionKey.start.offset + 1;
        recorder.remove(offset, optionKey.value.length);
        recorder.insertLeft(offset, 'skipTests');

        // invert value
        const { start, end } = optionValue;
        recorder.remove(start.offset, end.offset - start.offset);
        recorder.insertLeft(start.offset, `${!optionValue.value}`);
      }
    }
  }
}
