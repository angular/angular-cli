/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { JSONPath, Node, findNodeAtLocation, getNodeValue } from 'jsonc-parser';
import { JsonValue } from '../../json';
import { ProjectDefinition, TargetDefinition, WorkspaceDefinition } from '../definitions';

export const JsonWorkspaceSymbol = Symbol.for('@angular/core:workspace-json');

export interface JsonWorkspaceDefinition extends WorkspaceDefinition {
  [JsonWorkspaceSymbol]: JsonWorkspaceMetadata;
}

interface ChangeValues {
  json: JsonValue;
  project: ProjectDefinition;
  target: TargetDefinition;
  projectcollection: Iterable<[string, ProjectDefinition]>;
  targetcollection: Iterable<[string, TargetDefinition]>;
}

export interface JsonChange {
  value?: unknown;
  type?: keyof ChangeValues;
  jsonPath: string[];
}

function escapeKey(key: string): string | number {
  return key.replace('~', '~0').replace('/', '~1');
}

export class JsonWorkspaceMetadata {
  readonly changes = new Map<string, JsonChange>();

  hasLegacyTargetsName = true;

  constructor(readonly filePath: string, private readonly ast: Node, readonly raw: string) {}

  get hasChanges(): boolean {
    return this.changes.size > 0;
  }

  get changeCount(): number {
    return this.changes.size;
  }

  getNodeValueFromAst(path: JSONPath): unknown {
    const node = findNodeAtLocation(this.ast, path);

    return node && getNodeValue(node);
  }

  findChangesForPath(path: string): JsonChange | undefined {
    return this.changes.get(path);
  }

  addChange<T extends keyof ChangeValues = keyof ChangeValues>(
    jsonPath: string[],
    value: ChangeValues[T] | undefined,
    type?: T,
  ): void {
    let currentPath = '';
    for (let index = 0; index < jsonPath.length - 1; index++) {
      currentPath = currentPath + '/' + escapeKey(jsonPath[index]);
      if (this.changes.has(currentPath)) {
        // Ignore changes on children as parent is updated.
        return;
      }
    }

    const pathKey = '/' + jsonPath.map((k) => escapeKey(k)).join('/');
    for (const key of this.changes.keys()) {
      if (key.startsWith(pathKey + '/')) {
        // changes on the same or child paths are redundant.
        this.changes.delete(key);
      }
    }

    this.changes.set(pathKey, { jsonPath, type, value });
  }
}
