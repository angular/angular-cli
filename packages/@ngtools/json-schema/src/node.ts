import {Serializer} from './serializer';


// A TypeScript Type. This can be used to do `new tsType(value)`.
// `null` implies any type; be careful.
export type TypeScriptType = typeof Number
  | typeof Boolean
  | typeof String
  | typeof Object
  | typeof Array
  | null;


// The most generic interface for a schema node. This is used by the serializers.
export interface SchemaNode {
  readonly name: string;
  readonly type: string;
  readonly tsType: TypeScriptType;
  readonly defined: boolean;
  readonly dirty: boolean;
  readonly frozen: boolean;
  readonly readOnly: boolean;
  readonly defaultValue: any | null;
  readonly required: boolean;
  readonly parent: SchemaNode | null;

  // Schema related properties.
  readonly description: string | null;

  // Object-only properties. `null` for everything else.
  readonly children: { [key: string]: SchemaNode } | null;

  // Array-only properties. `null` for everything else.
  readonly items: SchemaNode[] | null;
  readonly itemPrototype: SchemaNode | null;

  // Mutable properties.
  value: any;

  // Serialization.
  serialize(serializer: Serializer): void;
}
