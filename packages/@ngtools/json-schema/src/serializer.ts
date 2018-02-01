import {JsonSchemaErrorBase} from './error';
import {SchemaNode} from './node';
export class InvalidStateError extends JsonSchemaErrorBase {}


export interface WriterFn {
  (str: string): void;
}

export abstract class Serializer {
  abstract start(): void;
  abstract end(): void;

  abstract object(node: SchemaNode): void;
  abstract property(node: SchemaNode): void;
  abstract array(node: SchemaNode): void;

  abstract outputOneOf(node: SchemaNode): void;
  abstract outputEnum(node: SchemaNode): void;

  abstract outputString(node: SchemaNode): void;
  abstract outputNumber(node: SchemaNode): void;
  abstract outputBoolean(node: SchemaNode): void;

  // Fallback when the value does not have metadata.
  abstract outputValue(node: SchemaNode): void;
}
