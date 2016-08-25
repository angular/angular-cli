import {NgToolkitError} from '../error';
import {Serializer} from './serializer';
import {RootSchemaTreeNode, SchemaTreeNode} from './schema-tree';

export class InvalidJsonPath extends NgToolkitError {}


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
  const result = [];

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
  return fragments.reduce((md: SchemaTreeNode<any>, current: string) => {
    return md && md.children && md.children[current];
  }, rootMetaData);
}


/** The interface the SchemaClassFactory returned class implements. */
export interface SchemaClass<ConfigType> extends ConfigType {
  new (config: ConfigType): SchemaClass<ConfigType>;

  $$get(path: string): any;
  $$set(path: string, value: any): void;
  $$alias(source: string, destination: string): boolean;
  $$dispose(): void;

  // Metadata of the schema.
  $$typeOf(path: string): string;
  $$defined(path: string): boolean;
  $$delete(path: string);

  $$serialize(mimetype?: string): string;
}


class SchemaClassBase<T> implements SchemaClass<T> {
  private [kSchemaNode]: SchemaTreeNode<T>;

  constructor(value: T) {
    this[kOriginalRoot] = value;
  }

  /** Sets the value of a destination if the value is currently undefined. */
  $$alias(source: string, destination: string) {
    let sourceSchemaTreeNode = _getSchemaNodeForPath(this[kSchemaNode], source);

    const fragments = _parseJsonPath(destination);
    const maybeValue = fragments.reduce((value: any, current: string) => {
      return value && value[current];
    }, this[kOriginalRoot]);

    if (maybeValue !== undefined) {
      sourceSchemaTreeNode.set(maybeValue);
      return true;
    }
    return false;
  }

  /** Destroy all links between schemas to allow for GC. */
  $$dispose() {
    this[kSchemaNode].dispose();
  }

  /** Get a value from a JSON path. */
  $$get(path: string): any {
    const node = _getSchemaNodeForPath(this[kSchemaNode], path);
    return node ? node.get() : undefined;
  }

  /** Set a value from a JSON path. */
  $$set(path: string, value: any) {
    const node = _getSchemaNodeForPath(this[kSchemaNode], path);
    if (node) {
      node.set(value);
    } else {
      // This might be inside an object that can have additionalProperties, so
      // a TreeNode would not exist.
      const splitPath = _parseJsonPath(path);
      if (!splitPath) {
        return undefined;
      }
      const parent = splitPath
        .slice(0, -1)
        .reduce((parent, curr) => parent && parent[curr], this);

      if (parent) {
        parent[splitPath[splitPath.length - 1]] = value;
      }
    }
  }

  /** Get the Schema associated with a path. */
  $$typeOf(path: string): string {
    const node = _getSchemaNodeForPath(this[kSchemaNode], path);
    return node ? node.type : null;
  }

  $$defined(path: string): boolean {
    const node = _getSchemaNodeForPath(this[kSchemaNode], path);
    return node ? node.defined : false;
  }

  $$delete(path: string) {
    const node = _getSchemaNodeForPath(this[kSchemaNode], path);
    if (node) {
      node.destroy();
    }
  }

  /** Serialize into a string. */
  $$serialize(mimetype = 'application/json', ...options: any[]): string {
    let str = '';
    const serializer = Serializer.fromMimetype(mimetype, (s) => str += s, ...options);

    serializer.start();
    this[kSchemaNode].serialize(serializer);
    serializer.end();

    return str;
  }
}


/**
 * Create a class from a JSON SCHEMA object. Instanciating that class with an object
 * allows for extended behaviour.
 * This is the base API to access the Configuration in the CLI.
 * @param schema
 * @returns {GeneratedSchemaClass}
 * @constructor
 */
export function SchemaClassFactory<T>(schema: Object): SchemaClassBase<T> {
  class GeneratedSchemaClass extends SchemaClassBase<T> {
    constructor(value: T, ...fallbacks: T[]) {
      super(value);

      this[kSchemaNode] = new RootSchemaTreeNode(this, {
        forward: fallbacks.length > 0 ? (new this.constructor(...fallbacks)[kSchemaNode]) : null,
        value,
        schema
      });
    }
  }

  return GeneratedSchemaClass;
}
