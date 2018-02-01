import {JsonSchemaErrorBase} from './error';
import {Serializer} from './serializer';
import {SchemaNode, TypeScriptType} from './node';


export class InvalidSchema extends JsonSchemaErrorBase {}
export class InvalidValueError extends JsonSchemaErrorBase {}
export class MissingImplementationError extends JsonSchemaErrorBase {}
export class SettingReadOnlyPropertyError extends JsonSchemaErrorBase {}
export class InvalidUpdateValue extends JsonSchemaErrorBase {}

export interface Schema {
  [key: string]: any;
}


/** This interface is defined to simplify the arguments passed in to the SchemaTreeNode. */
export type TreeNodeConstructorArgument<T> = {
  parent?: SchemaTreeNode<T>;
  name?: string;
  value: T;
  forward?: SchemaTreeNode<any>;
  schema: Schema;
};


/**
 * Holds all the information, including the value, of a node in the schema tree.
 */
export abstract class SchemaTreeNode<T> implements SchemaNode {
  // Hierarchy objects
  protected _parent: SchemaTreeNode<any>;

  protected _defined = false;
  protected _dirty = false;

  protected _schema: Schema;
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

    if (this._forward) {
      this._forward.dispose();
    }
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

  get value(): T { return this.get(); }

  abstract get type(): string;
  abstract get tsType(): TypeScriptType;
  abstract destroy(): void;
  abstract get defaultValue(): any | null;
  get name() { return this._name; }
  get readOnly(): boolean { return this._schema['readOnly']; }
  get frozen(): boolean { return true; }
  get description() {
    return 'description' in this._schema ? this._schema['description'] : null;
  }
  get required() {
    if (!this._parent) {
      return false;
    }
    return this._parent.isChildRequired(this.name);
  }

  isChildRequired(_name: string) { return false; }

  get parent(): SchemaTreeNode<any> { return this._parent; }
  get children(): { [key: string]: SchemaTreeNode<any> } | null { return null; }
  get items(): SchemaTreeNode<any>[] | null { return null; }
  get itemPrototype(): SchemaTreeNode<any> | null { return null; }

  abstract get(): T;
  set(_v: T, _init = false, _force = false) {
    if (!this.readOnly) {
      throw new MissingImplementationError();
    }
    throw new SettingReadOnlyPropertyError();
  }
  isCompatible(_v: any) { return false; }

  abstract serialize(serializer: Serializer): void;

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
export abstract class NonLeafSchemaTreeNode<T> extends SchemaTreeNode<T> {
  dispose() {
    for (const key of Object.keys(this.children || {})) {
      this.children[key].dispose();
    }
    for (let item of this.items || []) {
      item.dispose();
    }
    super.dispose();
  }

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
                                    schema: Schema, define = true): SchemaTreeNode<T> {
    const type: string =
      ('oneOf' in schema) ? 'oneOf' :
      ('enum' in schema) ? 'enum' : schema['type'];
    let Klass: { new (arg: TreeNodeConstructorArgument<any>): SchemaTreeNode<any> } = null;

    switch (type) {
      case 'object': Klass = ObjectSchemaTreeNode; break;
      case 'array': Klass = ArraySchemaTreeNode; break;
      case 'string': Klass = StringSchemaTreeNode; break;
      case 'boolean': Klass = BooleanSchemaTreeNode; break;
      case 'number': Klass = NumberSchemaTreeNode; break;
      case 'integer': Klass = IntegerSchemaTreeNode; break;

      case 'enum': Klass = EnumSchemaTreeNode; break;
      case 'oneOf': Klass = OneOfSchemaTreeNode; break;

      default:
        throw new InvalidSchema('Type ' + type + ' not understood by SchemaClassFactory.');
    }

    const metaData = new Klass({ parent: this, forward, value, schema, name });
    if (define) {
      SchemaTreeNode._defineProperty(this._value, metaData);
    }
    return metaData;
  }
}


export class OneOfSchemaTreeNode extends NonLeafSchemaTreeNode<any> {
  protected _typesPrototype: SchemaTreeNode<any>[];
  protected _currentTypeHolder: SchemaTreeNode<any> | null;

  constructor(metaData: TreeNodeConstructorArgument<any>) {
    super(metaData);

    let { value, forward, schema } = metaData;
    this._typesPrototype = schema['oneOf'].map((schema: Object) => {
      return this._createChildProperty('', '', forward, schema, false);
    });

    this._currentTypeHolder = null;
    this._set(value, true, false);
  }

  _set(v: any, init: boolean, force: boolean) {
    if (!init && this.readOnly && !force) {
      throw new SettingReadOnlyPropertyError();
    }

    // Find the first type prototype that is compatible with the
    let proto: SchemaTreeNode<any> = null;
    for (let i = 0; i < this._typesPrototype.length; i++) {
      const p = this._typesPrototype[i];
      if (p.isCompatible(v)) {
        proto = p;
        break;
      }
    }
    if (proto == null) {
      return;
    }

    if (!init) {
      this.dirty = true;
    }

    this._currentTypeHolder = proto;
    this._currentTypeHolder.set(v, false, true);
  }

  set(v: any, _init = false, force = false) {
    return this._set(v, false, force);
  }

  get(): any {
    return this._currentTypeHolder ? this._currentTypeHolder.get() : null;
  }
  get defaultValue(): any | null {
    return null;
  }

  get defined() { return this._currentTypeHolder ? this._currentTypeHolder.defined : false; }
  get items() { return this._typesPrototype; }
  get type() { return 'oneOf'; }
  get tsType(): null { return null; }

  serialize(serializer: Serializer) { serializer.outputOneOf(this); }
}


/** A Schema Tree Node that represents an object. */
export class ObjectSchemaTreeNode extends NonLeafSchemaTreeNode<{[key: string]: any}> {
  // The map of all children metadata.
  protected _children: { [key: string]: SchemaTreeNode<any> };
  protected _frozen = false;

  constructor(metaData: TreeNodeConstructorArgument<any>) {
    super(metaData);

    this._set(metaData.value, true, false);
  }

  _set(value: any, init: boolean, force: boolean) {
    if (!init && this.readOnly && !force) {
      throw new SettingReadOnlyPropertyError();
    }

    const schema = this._schema;
    const forward = this._forward;

    this._defined = !!value;
    this._children = Object.create(null);
    this._value = Object.create(null);
    this._dirty = this._dirty || !init;

    if (schema['properties']) {
      for (const name of Object.keys(schema['properties'])) {
        const propertySchema = schema['properties'][name];
        this._children[name] = this._createChildProperty(
          name,
          value ? value[name] : undefined,
          forward ? (forward as ObjectSchemaTreeNode).children[name] : null,
          propertySchema);
      }
    } else if (!schema['additionalProperties']) {
      throw new InvalidSchema('Schema does not have a properties, but doesnt allow for '
        + 'additional properties.');
    }

    if (!schema['additionalProperties']) {
      this._frozen = true;
      Object.freeze(this._value);
      Object.freeze(this._children);
    } else if (value) {
      // Set other properties which don't have a schema.
      for (const key of Object.keys(value)) {
        if (!this._children[key]) {
          this._value[key] = value[key];
        }
      }
    }
  }

  set(v: any, force = false) {
    return this._set(v, false, force);
  }

  get frozen(): boolean { return this._frozen; }

  get children(): { [key: string]: SchemaTreeNode<any> } | null { return this._children; }
  get type() { return 'object'; }
  get tsType() { return Object; }
  get defaultValue(): any | null { return null; }

  isCompatible(v: any) { return typeof v == 'object' && v !== null; }
  isChildRequired(name: string) {
    if (this._schema['required']) {
      return this._schema['required'].indexOf(name) != -1;
    }
    return false;
  }

  serialize(serializer: Serializer) { serializer.object(this); }
}


/** A Schema Tree Node that represents an array. */
export class ArraySchemaTreeNode extends NonLeafSchemaTreeNode<Array<any>> {
  // The map of all items metadata.
  protected _items: SchemaTreeNode<any>[];
  protected _itemPrototype: SchemaTreeNode<any>;

  constructor(metaData: TreeNodeConstructorArgument<Array<any>>) {
    super(metaData);
    this._set(metaData.value, true, false);

    // Keep the item's schema as a schema node. This is important to keep type information.
    this._itemPrototype = this._createChildProperty(
      '', undefined, null, metaData.schema['items'], false);
  }

  _set(value: any, init: boolean, _force: boolean) {
    const schema = this._schema;
    const forward = this._forward;

    this._value = Object.create(null);
    this._dirty = this._dirty || !init;

    if (value) {
      this._defined = true;
    } else {
      this._defined = false;
      value = [];
    }
    this._items = [];
    this._value = [];

    for (let index = 0; index < value.length; index++) {
      this._items[index] = this._createChildProperty(
        '' + index,
        value && value[index],
        forward && (forward as ArraySchemaTreeNode).items[index],
        schema['items']
      );
    }
  }

  set(v: any, init = false, force = false) {
    return this._set(v, init, force);
  }

  isCompatible(v: any) { return Array.isArray(v); }
  get type() { return 'array'; }
  get tsType() { return Array; }
  get items(): SchemaTreeNode<any>[] { return this._items; }
  get itemPrototype(): SchemaTreeNode<any> { return this._itemPrototype; }
  get defaultValue(): any | null { return null; }

  serialize(serializer: Serializer) { serializer.array(this); }
}


/**
 * The root class of the tree node. Receives a prototype that will be filled with the
 * properties of the Schema root.
 */
export class RootSchemaTreeNode extends ObjectSchemaTreeNode {
  constructor(proto: any, metaData: TreeNodeConstructorArgument<Object>) {
    super(metaData);

    for (const key of Object.keys(this._children)) {
      if (this._children[key]) {
        SchemaTreeNode._defineProperty(proto, this._children[key]);
      }
    }
  }
}


/** A leaf in the schema tree. Must contain a single primitive value. */
export abstract class LeafSchemaTreeNode<T> extends SchemaTreeNode<T> {
  protected _default: T;

  constructor(metaData: TreeNodeConstructorArgument<T>) {
    super(metaData);
    this._defined = metaData.value !== undefined;
    if ('default' in metaData.schema) {
      this._default = this.convert(metaData.schema['default']);
    }
  }

  get() {
    if (!this.defined && this._forward) {
      return this._forward.get();
    }
    if (!this.defined) {
      return 'default' in this._schema ? this._default : undefined;
    }
    return this._value === undefined
      ? undefined
      : (this._value === null ? null : this.convert(this._value));
  }
  set(v: T, init = false, force = false) {
    if (this.readOnly && !force) {
      throw new SettingReadOnlyPropertyError();
    }

    let convertedValue: T | null = this.convert(v);
    if (convertedValue === null || convertedValue === undefined) {
      if (this.required) {
        throw new InvalidValueError(`Invalid value "${v}" on a required field.`);
      }
    }

    this.dirty = !init;
    this._value = convertedValue;
  }

  destroy() {
    this._defined = false;
    this._value = null;
  }

  get defaultValue(): T {
    return this.hasDefault ? this._default : null;
  }
  get hasDefault() {
    return 'default' in this._schema;
  }

  abstract convert(v: any): T;
  abstract isCompatible(v: any): boolean;

  serialize(serializer: Serializer) {
    serializer.outputValue(this);
  }
}


/** Basic primitives for JSON Schema. */
class StringSchemaTreeNode extends LeafSchemaTreeNode<string> {
  serialize(serializer: Serializer) { serializer.outputString(this); }

  isCompatible(v: any) { return typeof v == 'string' || v instanceof String; }
  convert(v: any) { return v === undefined ? undefined : '' + v; }
  get type() { return 'string'; }
  get tsType() { return String; }
}


class EnumSchemaTreeNode extends LeafSchemaTreeNode<any> {
  constructor(metaData: TreeNodeConstructorArgument<any>) {
    super(metaData);

    if (!Array.isArray(metaData.schema['enum'])) {
      throw new InvalidSchema();
    }
    if (this.hasDefault && !this._isInEnum(this._default)) {
      throw new InvalidSchema();
    }
    this.set(metaData.value, true, true);
  }

  protected _isInEnum(value: string) {
    return this._schema['enum'].some((v: string) => v === value);
  }

  get items() { return this._schema['enum']; }

  set(value: string, init = false, force = false) {
    if (!(value === undefined || this._isInEnum(value))) {
      throw new InvalidUpdateValue('Invalid value can only be one of these: ' + this.items);
    }
    super.set(value, init, force);
  }

  isCompatible(v: any) {
    return this._isInEnum(v);
  }
  convert(v: any) {
    if (v === undefined) {
      return undefined;
    }
    if (!this._isInEnum(v)) {
      return undefined;
    }
    return v;
  }

  get type() {
    return this._schema['type'] || 'any';
  }
  get tsType(): null { return null; }
  serialize(serializer: Serializer) { serializer.outputEnum(this); }
}


class BooleanSchemaTreeNode extends LeafSchemaTreeNode<boolean> {
  serialize(serializer: Serializer) { serializer.outputBoolean(this); }

  isCompatible(v: any) { return typeof v == 'boolean' || v instanceof Boolean; }
  convert(v: any) { return v === undefined ? undefined : !!v; }
  get type() { return 'boolean'; }
  get tsType() { return Boolean; }
}


class NumberSchemaTreeNode extends LeafSchemaTreeNode<number> {
  serialize(serializer: Serializer) { serializer.outputNumber(this); }

  isCompatible(v: any) { return typeof v == 'number' || v instanceof Number; }
  convert(v: any) { return v === undefined ? undefined : +v; }
  get type() { return 'number'; }
  get tsType() { return Number; }
}


class IntegerSchemaTreeNode extends NumberSchemaTreeNode {
  convert(v: any) { return v === undefined ? undefined : Math.floor(+v); }
}
