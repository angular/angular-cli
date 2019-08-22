/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonValue } from '../json';

export interface WorkspaceDefinition {
  readonly extensions: Record<string, JsonValue | undefined>;

  readonly projects: ProjectDefinitionCollection;
}

export interface ProjectDefinition {
  readonly extensions: Record<string, JsonValue | undefined>;
  readonly targets: TargetDefinitionCollection;

  root: string;
  prefix?: string;
  sourceRoot?: string;
}

export interface TargetDefinition {
  options?: Record<string, JsonValue | undefined>;
  configurations?: Record<string, Record<string, JsonValue | undefined> | undefined>;

  builder: string;
}

export type DefinitionCollectionListener<V extends object> = (
  name: string,
  action: 'add' | 'remove' | 'replace',
  newValue: V | undefined,
  oldValue: V | undefined,
  collection: DefinitionCollection<V>,
) => void;

class DefinitionCollection<V extends object> implements ReadonlyMap<string, V> {
  private _map: Map<string, V>;

  constructor(
    initial?: Record<string, V>,
    private _listener?: DefinitionCollectionListener<V>,
  ) {
    this._map = new Map(initial && Object.entries(initial));
  }

  delete(key: string): boolean {
    const value = this._map.get(key);
    const result = this._map.delete(key);
    if (result && value !== undefined && this._listener) {
      this._listener(key, 'remove', undefined, value, this);
    }

    return result;
  }

  set(key: string, value: V): this {
    const existing = this.get(key);
    this._map.set(key, value);

    if (this._listener) {
      this._listener(key, existing !== undefined ? 'replace' : 'add', value, existing, this);
    }

    return this;
  }

  forEach<T>(
    callbackfn: (value: V, key: string, map: DefinitionCollection<V>) => void,
    thisArg?: T,
  ): void {
    this._map.forEach((value, key) => callbackfn(value, key, this), thisArg);
  }

  get(key: string): V | undefined {
    return this._map.get(key);
  }

  has(key: string): boolean {
    return this._map.has(key);
  }

  get size(): number {
    return this._map.size;
  }

  [Symbol.iterator](): IterableIterator<[string, V]> {
    return this._map[Symbol.iterator]();
  }

  entries(): IterableIterator<[string, V]> {
    return this._map.entries();
  }

  keys(): IterableIterator<string> {
    return this._map.keys();
  }

  values(): IterableIterator<V> {
    return this._map.values();
  }
}

function isJsonValue(value: unknown): value is JsonValue {
  const visited = new Set();

  switch (typeof value) {
    case 'boolean':
    case 'number':
    case 'string':
      return true;
    case 'object':
      if (value === null) {
        return true;
      }
      visited.add(value);
      for (const property of Object.values(value)) {
        if (typeof value === 'object' && visited.has(property)) {
          continue;
        }
        if (!isJsonValue(property)) {
          return false;
        }
      }

      return true;
    default:
      return false;
  }
}

export class ProjectDefinitionCollection extends DefinitionCollection<ProjectDefinition> {

  constructor(
    initial?: Record<string, ProjectDefinition>,
    listener?: DefinitionCollectionListener<ProjectDefinition>,
  ) {
    super(initial, listener);
  }

  add(
    definition: {
      name: string,
      root: string,
      sourceRoot?: string,
      prefix?: string,
      targets?: Record<string, TargetDefinition | undefined>,
      [key: string]: unknown,
    },
  ): ProjectDefinition {
    if (this.has(definition.name)) {
      throw new Error('Project name already exists.');
    }
    this._validateName(definition.name);

    const project: ProjectDefinition = {
      root: definition.root,
      prefix: definition.prefix,
      sourceRoot: definition.sourceRoot,
      targets: new TargetDefinitionCollection(),
      extensions: {},
    };

    if (definition.targets) {
      for (const [name, target] of Object.entries(definition.targets)) {
        if (target) {
          project.targets.set(name, target);
        }
      }
    }

    for (const [name, value] of Object.entries(definition)) {
      switch (name) {
        case 'name':
        case 'root':
        case 'sourceRoot':
        case 'prefix':
        case 'targets':
          break;
        default:
          if (isJsonValue(value)) {
            project.extensions[name] = value;
          } else {
            throw new TypeError(`"${name}" must be a JSON value.`);
          }
          break;
      }
    }

    super.set(definition.name, project);

    return project;
  }

  set(name: string, value: ProjectDefinition): this {
    this._validateName(name);

    super.set(name, value);

    return this;
  }

  private _validateName(name: string): void {
    if (typeof name !== 'string' || !/^(?:@\w[\w\.-]*\/)?\w[\w\.-]*$/.test(name)) {
      throw new Error('Project name must be a valid npm package name.');
    }
  }

}

export class TargetDefinitionCollection extends DefinitionCollection<TargetDefinition> {

  constructor(
    initial?: Record<string, TargetDefinition>,
    listener?: DefinitionCollectionListener<TargetDefinition>,
  ) {
    super(initial, listener);
  }

  add(
    definition: {
      name: string,
    } & TargetDefinition,
  ): TargetDefinition {
    if (this.has(definition.name)) {
      throw new Error('Target name already exists.');
    }
    this._validateName(definition.name);

    const target = {
      builder: definition.builder,
      options: definition.options,
      configurations: definition.configurations,
    };

    super.set(definition.name, target);

    return target;
  }

  set(name: string, value: TargetDefinition): this {
    this._validateName(name);

    super.set(name, value);

    return this;
  }

  private _validateName(name: string): void {
    if (typeof name !== 'string') {
      throw new TypeError('Target name must be a string.');
    }
  }

}
