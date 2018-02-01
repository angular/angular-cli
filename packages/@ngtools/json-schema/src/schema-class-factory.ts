import {Serializer} from './serializer';
import {RootSchemaTreeNode, SchemaTreeNode} from './schema-tree';
import {JsonSchemaErrorBase} from './error';

import './mimetypes';

export class InvalidJsonPath extends JsonSchemaErrorBase {}

// The schema tree node property of the SchemaClass.
const kSchemaNode = Symbol('schema-node');
// The value property of the SchemaClass.
const kOriginalRoot = Symbol('schema-value');


/**
 * Splits a JSON path string into fragments. Fragments can be used to get the value referenced
 * by the path. For example, a path of "a[3].foo.bar[2]" would give you a fragment array of
 * ["a", 3, "foo", "bar", 2].
 * @param path The JSON string to parse.
 * @returns {string[]} The fragments for the string.
 * @private
 */
function _parseJsonPath(path: string): string[] {
  const fragments = (path || '').split(/\./g);
  const result: string[] = [];

  while (fragments.length > 0) {
    const fragment = fragments.shift();

    const match = fragment.match(/([^\[]+)((\[.*\])*)/);
    if (!match) {
      throw new InvalidJsonPath();
    }

    result.push(match[1]);
    if (match[2]) {
      const indices = match[2].slice(1, -1).split('][');
      result.push(...indices);
    }
  }

  return result.filter(fragment => !!fragment);
}


/** Get a SchemaTreeNode from the JSON path string. */
function _getSchemaNodeForPath<T>(rootMetaData: SchemaTreeNode<T>,
                                  path: string): SchemaTreeNode<any> {
  let fragments = _parseJsonPath(path);
  // TODO: make this work with union (oneOf) schemas
  return fragments.reduce((md: SchemaTreeNode<any>, current: string) => {
    if (md && md.children) {
      return md.children[current];
    } else if (md && md.items) {
      return md.items[parseInt(current, 10)];
    } else {
      return md;
    }
  }, rootMetaData);
}


/** The interface the SchemaClassFactory returned class implements. */
export interface SchemaClass<JsonType> extends Object {
  $$root(): JsonType;
  $$get(path: string): any;
  $$set(path: string, value: any): void;
  $$alias(source: string, destination: string): boolean;
  $$dispose(): void;

  // Metadata of the schema.
  $$typeOf(path: string): string;
  $$defined(path: string): boolean;
  $$delete(path: string): void;

  // Direct access to the schema.
  $$schema(): RootSchemaTreeNode;

  $$serialize(mimetype?: string, ...args: any[]): string;
}


class SchemaClassBase<T> implements SchemaClass<T> {
  constructor(schema: Object, value: T, ...fallbacks: T[]) {
    (this as any)[kOriginalRoot] = value;
    const forward = fallbacks.length > 0
                  ? (new SchemaClassBase<T>(schema, fallbacks.pop(), ...fallbacks).$$schema())
                  : null;
    (this as any)[kSchemaNode] = new RootSchemaTreeNode(this, {
      forward,
      value,
      schema
    });
  }

  $$root(): T { return this as any; }
  $$schema(): RootSchemaTreeNode { return (this as any)[kSchemaNode] as RootSchemaTreeNode; }
  $$originalRoot(): T { return (this as any)[kOriginalRoot] as T; }

  /** Sets the value of a destination if the value is currently undefined. */
  $$alias(source: string, destination: string) {
    let sourceSchemaTreeNode = _getSchemaNodeForPath(this.$$schema(), source);
    if (!sourceSchemaTreeNode) {
      return false;
    }

    const fragments = _parseJsonPath(destination);
    const maybeValue = fragments.reduce((value: any, current: string) => {
      return value && value[current];
    }, this.$$originalRoot());

    if (maybeValue !== undefined) {
      sourceSchemaTreeNode.set(maybeValue);
      return true;
    }
    return false;
  }

  /** Destroy all links between schemas to allow for GC. */
  $$dispose() {
    this.$$schema().dispose();
  }

  /** Get a value from a JSON path. */
  $$get(path: string): any {
    const node = _getSchemaNodeForPath(this.$$schema(), path);
    return node ? node.get() : undefined;
  }

  /** Set a value from a JSON path. */
  $$set(path: string, value: any): void {
    const node = _getSchemaNodeForPath(this.$$schema(), path);

    if (node) {
      node.set(value);
    } else {
      // This might be inside an object that can have additionalProperties, so
      // a TreeNode would not exist.
      const splitPath = _parseJsonPath(path);
      if (!splitPath) {
        return undefined;
      }
      const parent: any = splitPath
        .slice(0, -1)
        .reduce((parent: any, curr: string) => parent && parent[curr], this);

      if (parent) {
        parent[splitPath[splitPath.length - 1]] = value;
      }
    }
  }

  /** Get the Schema associated with a path. */
  $$typeOf(path: string): string {
    const node = _getSchemaNodeForPath(this.$$schema(), path);
    return node ? node.type : null;
  }

  $$defined(path: string): boolean {
    const node = _getSchemaNodeForPath(this.$$schema(), path);
    return node ? node.defined : false;
  }

  $$delete(path: string) {
    const node = _getSchemaNodeForPath(this.$$schema(), path);
    if (node) {
      node.destroy();
    }
  }

  /** Serialize into a string. */
  $$serialize(mimetype = 'application/json', ...options: any[]): string {
    let str = '';
    const serializer = Serializer.fromMimetype(mimetype, (s) => str += s, ...options);

    serializer.start();
    this.$$schema().serialize(serializer);
    serializer.end();

    return str;
  }
}
export interface SchemaClassFactoryReturn<T> {
  new (value: T, ...fallbacks: T[]): SchemaClass<T>;
}

/**
 * Create a class from a JSON SCHEMA object. Instanciating that class with an object
 * allows for extended behaviour.
 * This is the base API to access the Configuration in the CLI.
 * @param schema
 * @returns {GeneratedSchemaClass}
 * @constructor
 */
export function SchemaClassFactory<T>(schema: Object): SchemaClassFactoryReturn<T> {
  class GeneratedSchemaClass extends SchemaClassBase<T> {
    constructor(value: T, ...fallbacks: T[]) {
      super(schema, value, ...fallbacks);
    }
  }

  return GeneratedSchemaClass;
}
