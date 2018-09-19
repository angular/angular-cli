/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  JsonAstArray,
  JsonAstKeyValue,
  JsonAstNode,
  JsonAstObject,
  JsonValue,
} from '@angular-devkit/core';
import { UpdateRecorder } from '@angular-devkit/schematics';

export function appendPropertyInAstObject(
  recorder: UpdateRecorder,
  node: JsonAstObject,
  propertyName: string,
  value: JsonValue,
  indent: number,
) {
  const indentStr = _buildIndent(indent);

  if (node.properties.length > 0) {
    // Insert comma.
    const last = node.properties[node.properties.length - 1];
    recorder.insertRight(last.start.offset + last.text.replace(/\s+$/, '').length, ',');
  }

  recorder.insertLeft(
    node.end.offset - 1,
    '  '
    + `"${propertyName}": ${JSON.stringify(value, null, 2).replace(/\n/g, indentStr)}`
    + indentStr.slice(0, -2),
  );
}

export function insertPropertyInAstObjectInOrder(
  recorder: UpdateRecorder,
  node: JsonAstObject,
  propertyName: string,
  value: JsonValue,
  indent: number,
) {

  if (node.properties.length === 0) {
    appendPropertyInAstObject(recorder, node, propertyName, value, indent);

    return;
  }

  // Find insertion info.
  let insertAfterProp: JsonAstKeyValue | null = null;
  let prev: JsonAstKeyValue | null = null;
  let isLastProp = false;
  const last = node.properties[node.properties.length - 1];
  for (const prop of node.properties) {
    if (prop.key.value > propertyName) {
      if (prev) {
        insertAfterProp = prev;
      }
      break;
    }
    if (prop === last) {
      isLastProp = true;
      insertAfterProp = last;
    }
    prev = prop;
  }

  if (isLastProp) {
    appendPropertyInAstObject(recorder, node, propertyName, value, indent);

    return;
  }

  const indentStr = _buildIndent(indent);

  const insertIndex = insertAfterProp === null
    ? node.start.offset + 1
    : insertAfterProp.end.offset + 1;

  recorder.insertRight(
    insertIndex,
    indentStr
    + `"${propertyName}": ${JSON.stringify(value, null, 2).replace(/\n/g, indentStr)}`
    + ',',
  );
}


export function appendValueInAstArray(
  recorder: UpdateRecorder,
  node: JsonAstArray,
  value: JsonValue,
  indent = 4,
) {
  const indentStr = _buildIndent(indent);

  if (node.elements.length > 0) {
    // Insert comma.
    const last = node.elements[node.elements.length - 1];
    recorder.insertRight(last.start.offset + last.text.replace(/\s+$/, '').length, ',');
  }

  recorder.insertLeft(
    node.end.offset - 1,
    '  '
    + JSON.stringify(value, null, 2).replace(/\n/g, indentStr)
    + indentStr.slice(0, -2),
  );
}


export function findPropertyInAstObject(
  node: JsonAstObject,
  propertyName: string,
): JsonAstNode | null {
  let maybeNode: JsonAstNode | null = null;
  for (const property of node.properties) {
    if (property.key.value == propertyName) {
      maybeNode = property.value;
    }
  }

  return maybeNode;
}

function _buildIndent(count: number): string {
  return '\n' + new Array(count + 1).join(' ');
}
