import {SchemaNode} from '../node';
import {Serializer, WriterFn} from '../serializer';


interface JsonSerializerState {
  empty?: boolean;
  type?: string;
  property?: boolean;
}

export class JsonSerializer implements Serializer {
  private _state: JsonSerializerState[] = [];

  constructor(private _writer: WriterFn, private _indentDelta = 2) {}

  private _willOutputValue() {
    if (this._state.length > 0) {
      const top = this._top();

      const wasEmpty = top.empty;
      top.empty = false;

      if (!wasEmpty && !top.property) {
        this._writer(',');
      }
      if (!top.property) {
        this._indent();
      }
    }
  }

  private _top(): JsonSerializerState {
    return this._state[this._state.length - 1] || {};
  }

  private _indent(): string {
    if (this._indentDelta == 0) {
      return;
    }

    let str = '\n';
    let i = this._state.length * this._indentDelta;
    while (i--) {
      str += ' ';
    }
    this._writer(str);
  }

  start() {}
  end() {
    if (this._indentDelta) {
      this._writer('\n');
    }
  }

  object(node: SchemaNode) {
    if (node.defined == false) {
      return;
    }

    this._willOutputValue();

    this._writer('{');
    this._state.push({ empty: true, type: 'object' });

    for (const key of Object.keys(node.children)) {
      this.property(node.children[key]);
    }

    // Fallback to direct value output for additional properties.
    if (!node.frozen) {
      for (const key of Object.keys(node.value)) {
        if (key in node.children) {
          continue;
        }

        this._willOutputValue();
        this._writer(JSON.stringify(key));
        this._writer(': ');
        this._writer(JSON.stringify(node.value[key]));
      }
    }

    this._state.pop();

    if (!this._top().empty) {
      this._indent();
    }
    this._writer('}');
  }

  property(node: SchemaNode) {
    if (node.defined == false) {
      return;
    }

    this._willOutputValue();

    this._writer(JSON.stringify(node.name));
    this._writer(': ');
    this._top().property = true;
    node.serialize(this);
    this._top().property = false;
  }

  array(node: SchemaNode) {
    if (node.defined == false) {
      return;
    }

    this._willOutputValue();

    if (node.items.length === 0) {
      this._writer('[]');
      return;
    }

    this._writer('[');
    this._state.push({ empty: true, type: 'array' });
    for (let i = 0; i < node.items.length; i++) {
      node.items[i].serialize(this);
    }
    this._state.pop();

    if (!this._top().empty) {
      this._indent();
    }
    this._writer(']');
  }

  outputOneOf(node: SchemaNode) {
    this.outputValue(node);
  }
  outputEnum(node: SchemaNode) {
    this.outputValue(node);
  }

  outputValue(node: SchemaNode) {
    this._willOutputValue();
    this._writer(JSON.stringify(node.value, null, this._indentDelta));
  }

  outputString(node: SchemaNode) {
    this._willOutputValue();
    this._writer(JSON.stringify(node.value));
  }
  outputNumber(node: SchemaNode) {
    this._willOutputValue();
    this._writer(JSON.stringify(node.value));
  }
  outputInteger(node: SchemaNode) {
    this._willOutputValue();
    this._writer(JSON.stringify(node.value));
  }
  outputBoolean(node: SchemaNode) {
    this._willOutputValue();
    this._writer(JSON.stringify(node.value));
  }
}
