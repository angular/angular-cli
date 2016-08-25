import {NgToolkitError} from '../error';

import {Serializer} from './serializer';


export class InvalidSchema extends NgToolkitError {}
export class MissingImplementationError extends NgToolkitError {}
export class SettingReadOnlyPropertyError extends NgToolkitError {}


/** This interface is defined to simplify the arguments passed in to the SchemaTreeNode. */
interface TreeNodeConstructorArgument<T> {
  parent?: SchemaTreeNode<T>;
  name?: string;
  value: T;
  forward: SchemaTreeNode<any>;
  schema: Object;
}


/** A constructor for a SchemaTreeNode. */
interface TreeNodeConstructor {
  new (x: TreeNodeConstructorArgument): SchemaTreeNode<any>;
}


/**
 * Holds all the information, including the value, of a node in the schema tree.
 */
export abstract class SchemaTreeNode<T> {
  // Hierarchy objects
  protected _parent: SchemaTreeNode<any>;

  protected _defined: boolean = false;
  protected _dirty: boolean = false;

  protected _schema: Object;
  protected _name: string;

  protected _value: T;
  protected _forward: SchemaTreeNode<any>;

  constructor(nodeMetaData: TreeNodeConstructorArgument<T>) {
    this._schema = nodeMetaData.schema;
    this._name = nodeMetaData.name;
    this._value = nodeMetaData.value;
    this._forward = nodeMetaData.forward;
    this._parent = nodeMetaData.parent;
  }
  dispose() {
    this._parent = null;
    this._schema = null;
    this._value = null;

    this._forward.dispose();
    this._forward = null;
  }

  get defined() { return this._defined; }
  get dirty() { return this._dirty; }
  set dirty(v: boolean) {
    if (v) {
      this._defined = true;
      this._dirty = true;
      if (this._parent) {
        this._parent.dirty = true;
      }
    }
  }

  abstract get type(): string;
  abstract destroy(): void;
  get name() { return this._name; }
  get readOnly(): boolean { return this._schema['readOnly']; }
  get parent<ParentType>(): SchemaTreeNode<ParentType> { return this._parent; }
  get children<ChildType>(): { [key: string]: SchemaTreeNode<ChildType>} { return null; }

  abstract get(): T;
  set(v: T) {
    if (!this.readOnly) {
      throw new MissingImplementationError();
    }
    throw new SettingReadOnlyPropertyError();
  };

  abstract serialize(serializer: Serializer, value?: T = this.get());

  protected static _defineProperty<T>(proto: any, treeNode: SchemaTreeNode<T>): void {
    if (treeNode.readOnly) {
      Object.defineProperty(proto, treeNode.name, {
        enumerable: true,
        get: () => treeNode.get()
      });
    } else {
      Object.defineProperty(proto, treeNode.name, {
        enumerable: true,
        get: () => treeNode.get(),
        set: (v: T) => treeNode.set(v)
      });
    }
  }
}


/** Base Class used for Non-Leaves TreeNode. Meaning they can have children. */
abstract class NonLeafSchemaTreeNode<T> extends SchemaTreeNode<T> {
  dispose() {
    for (const key of Object.keys(this.children)) {
      this.children[key].dispose();
    }
    super.dispose();
  }

  // Non leaves are read-only.
  get readOnly() { return true; }
  get() {
    if (this.defined) {
      return this._value;
    } else {
      return undefined;
    }
  }

  destroy() {
    this._defined = false;
    this._value = null;
  }

  // Helper function to create a child based on its schema.
  protected _createChildProperty<T>(name: string, value: T, forward: SchemaTreeNode<T>,
                                    schema: Object, define = true): SchemaTreeNode<T> {
    const type = schema['type'];
    let Klass: TreeNodeConstructor = null;

    switch (type) {
      case 'object': Klass = ObjectSchemaTreeNode; break;
      case 'array': Klass = ArraySchemaTreeNode; break;
      case 'string': Klass = StringSchemaTreeNode; break;
      case 'boolean': Klass = BooleanSchemaTreeNode; break;
      case 'number': Klass = NumberSchemaTreeNode; break;
      case 'integer': Klass = IntegerSchemaTreeNode; break;

      default:
        console.error('Type ' + type + ' not understood by SchemaClassFactory.');
        return null;
    }

    const metaData = new Klass({ parent: this, forward, value, schema, name });
    if (define) {
      SchemaTreeNode._defineProperty(this._value, metaData);
    }
    return metaData;
  }
}


/** A Schema Tree Node that represents an object. */
class ObjectSchemaTreeNode extends NonLeafSchemaTreeNode<Object> {
  // The map of all children metadata.
  protected _children: { [key: string]: SchemaTreeNode<any> };

  constructor(metaData: TreeNodeConstructorArgument) {
    super(metaData);

    let { value, forward, schema } = metaData;
    if (value) {
      this._defined = true;
    }
    this._children = Object.create(null);
    this._value = Object.create(null);

    if (schema['properties']) {
      for (const name of Object.keys(schema['properties'])) {
        const propertySchema = schema['properties'][name];
        this._children[name] = this._createChildProperty(
          name,
          value && value[name],
          forward && (forward as NonLeafSchemaTreeNode).children[name],
          propertySchema);
      }
    } else if (!schema['additionalProperties']) {
      throw new InvalidSchema();
    }

    if (!schema['additionalProperties']) {
      Object.freeze(this._value);
    } else if (value) {
      // Set other properties which don't have a schema.
      for (const key of Object.keys(value)) {
        if (!this._children[key]) {
          this._value[key] = value[key];
        }
      }
    }

    Object.freeze(this._children);
  }

  serialize(serializer: Serializer, value = this._value) {
    serializer.object(() => {
      for (const key of Object.keys(value)) {
        if (this._children[key]) {
          if (this._children[key].defined) {
            serializer.property(key, () => this._children[key].serialize(serializer, value[key]));
          }
        } else if (this._schema['additionalProperties']) {
          serializer.property(key, () => this._children[key].serialize(serializer, value[key]));
        }
      }
    });
  }

  get children() { return this._children; }
  get type() { return 'object'; }
}


/** A Schema Tree Node that represents an array. */
class ArraySchemaTreeNode extends NonLeafSchemaTreeNode<Array> {
  // The map of all items metadata.
  protected _items: SchemaTreeNode<any>[];

  constructor(metaData: TreeNodeConstructorArgument) {
    super(metaData);

    let { value, forward, schema } = metaData;
    if (value) {
      this._defined = true;
    } else {
      value = [];
    }
    this._items = [];
    this._value = [];

    for (let index = 0; index < value.length; index++) {
      this._items[index] = this._createChildProperty(
        '' + index,
        value && value[index],
        forward && (forward as NonLeafSchemaTreeNode).children[index],
        schema['items']
      );
    }

    if (!schema['additionalProperties']) {
      Object.freeze(this._value);
    }
  }

  get children() { return this._items; }
  get type() { return 'array'; }

  serialize(serializer: Serializer, value = this._value) {
    serializer.array(() => {
      for (let i = 0; i < value.length; i++) {
        this._items[i].serialize(serializer, value[i]);
      }
    });
  }
}


/**
 * The root class of the tree node. Receives a prototype that will be filled with the
 * properties of the Schema root.
 */
export class RootSchemaTreeNode extends ObjectSchemaTreeNode {
  constructor(proto: SchemaClassBase<any>, metaData: TreeNodeConstructorArgument) {
    super(metaData);

    for (const key of Object.keys(this._children)) {
      if (this._children[key]) {
        SchemaTreeNode._defineProperty(proto, this._children[key]);
      }
    }
  }
}


/** A leaf in the schema tree. Must contain a single primitive value. */
abstract class LeafSchemaTreeNode<T> extends SchemaTreeNode<T> {
  private _default: T;

  constructor(metaData: TreeNodeConstructorArgument) {
    super(metaData);
    this._defined = metaData.value !== undefined;
    if ('default' in metaData.schema) {
      this._default = metaData.schema['default'];
    }
  }

  get() {
    if (!this.defined && this._forward) {
      return this._forward.get();
    }
    if (!this.defined && this._default !== undefined) {
      return this._default;
    }
    return this._value === undefined ? undefined : this.convert(this._value);
  }
  set(v) { this.dirty = true; this._value = this.convert(v); }

  destroy() {
    this._defined = false;
    this._value = null;
  }

  abstract convert(v: any): T;

  serialize(serializer: Serializer, value?: T = this.get()) {
    if (this.defined) {
      serializer.outputValue(value);
    }
  }
}


/** Basic primitives for JSON Schema. */
class StringSchemaTreeNode extends LeafSchemaTreeNode<string> {
  serialize(serializer: Serializer, value?: string = this.get()) {
    if (this.defined) {
      serializer.outputString(value);
    }
  }

  convert(v: any) { return v === undefined ? undefined : '' + v; }
  get type() { return 'string'; }
}


class BooleanSchemaTreeNode extends LeafSchemaTreeNode<boolean> {
  serialize(serializer: Serializer, value?: boolean = this.get()) {
    if (this.defined) {
      serializer.outputBoolean(value);
    }
  }

  convert(v: any) { return v === undefined ? undefined : !!v; }
  get type() { return 'boolean'; }
}


class NumberSchemaTreeNode extends LeafSchemaTreeNode<number> {
  serialize(serializer: Serializer, value?: number = this.get()) {
    if (this.defined) {
      serializer.outputNumber(value);
    }
  }

  convert(v: any) { return v === undefined ? undefined : +v; }
  get type() { return 'number'; }
}


class IntegerSchemaTreeNode extends NumberSchemaTreeNode {
  convert(v: any) { return v === undefined ? undefined : Math.floor(+v); }
}
