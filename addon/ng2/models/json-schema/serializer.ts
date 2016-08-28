import {NgToolkitError} from '../error';
export class InvalidStateError extends NgToolkitError {}
export class UnknownMimetype extends NgToolkitError {}


export interface WriterFn {
  (str: string): void;
}

export abstract class Serializer {
  abstract start(): void;
  abstract end(): void;

  abstract object(callback: () => void): void;
  abstract property(name: string, callback: () => void): void;
  abstract array(callback: () => void): void;

  abstract outputString(value: string): void;
  abstract outputNumber(value: number): void;
  abstract outputBoolean(value: boolean): void;

  // Fallback when the value does not have metadata.
  abstract outputValue(value: any): void;


  static fromMimetype(mimetype: string, writer: WriterFn, ...opts: any[]): Serializer {
    let Klass: { new(writer: WriterFn, ...args: any[]): Serializer } = null;
    switch (mimetype) {
      case 'application/json': Klass = JsonSerializer; break;

      default: throw new UnknownMimetype();
    }

    return new Klass(writer, ...opts);
  }
}


interface JsonSerializerState {
  empty?: boolean;
  type?: string;
  property?: boolean;
}

class JsonSerializer implements Serializer {
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

  object(callback: () => void) {
    this._willOutputValue();

    this._writer('{');

    this._state.push({ empty: true, type: 'object' });
    callback();
    this._state.pop();

    if (!this._top().empty) {
      this._indent();
    }
    this._writer('}');
  }

  property(name: string, callback: () => void) {
    this._willOutputValue();

    this._writer(JSON.stringify(name));
    this._writer(': ');
    this._top().property = true;
    callback();
    this._top().property = false;
  }

  array(callback: () => void) {
    this._willOutputValue();

    this._writer('[');
    this._state.push({ empty: true, type: 'array' });
    callback();
    this._state.pop();

    if (!this._top().empty) {
      this._indent();
    }
    this._writer(']');
  }

  outputValue(value: any) {
    this._willOutputValue();
    this._writer(JSON.stringify(value, null, this._indentDelta));
  }

  outputString(value: string) {
    this._willOutputValue();
    this._writer(JSON.stringify(value));
  }
  outputNumber(value: number) {
    this._willOutputValue();
    this._writer(JSON.stringify(value));
  }
  outputInteger(value: number) {
    this._willOutputValue();
    this._writer(JSON.stringify(value));
  }
  outputBoolean(value: boolean) {
    this._willOutputValue();
    this._writer(JSON.stringify(value));
  }
}
