/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonAstArray, JsonAstKeyValue, JsonAstNode, JsonAstObject, JsonValue } from '../../json';
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

export interface JsonChange<T extends keyof ChangeValues = keyof ChangeValues> {
  // core collections can only be added as they are managed directly by _Collection_ objects
  op: T extends 'json' | 'project' | 'target' ? 'add' | 'remove' | 'replace' : 'add';
  path: string;
  node: JsonAstNode | JsonAstKeyValue;
  value?: ChangeValues[T];
  type: T;
}

export class JsonWorkspaceMetadata {
  readonly changes: JsonChange[] = [];

  constructor(readonly filePath: string, readonly ast: JsonAstObject, readonly raw: string) { }

  get hasChanges(): boolean {
    return this.changes.length > 0;
  }

  get changeCount(): number {
    return this.changes.length;
  }

  findChangesForPath(path: string): JsonChange[] {
    return this.changes.filter(c => c.path === path);
  }

  addChange<T extends keyof ChangeValues = keyof ChangeValues>(
    op: 'add' | 'remove' | 'replace',
    path: string,
    node: JsonAstArray | JsonAstObject | JsonAstKeyValue,
    value?: ChangeValues[T],
    type?: T,
  ): void {
    // Remove redundant operations
    if (op === 'remove' || op === 'replace') {
      for (let i = this.changes.length - 1; i >= 0; --i) {
        const currentPath = this.changes[i].path;
        if (currentPath === path || currentPath.startsWith(path + '/')) {
          if (op === 'replace' && currentPath === path && this.changes[i].op === 'add') {
            op = 'add';
          }
          this.changes.splice(i, 1);
        }
      }
    }

    this.changes.push({ op, path, node, value, type: op === 'remove' || !type ? 'json' : type });
  }

  reset(): void {
    this.changes.length = 0;
  }
}
