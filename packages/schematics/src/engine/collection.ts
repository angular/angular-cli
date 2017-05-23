import {SchematicEngine} from './engine';
import {Collection, CollectionDescription, Schematic, SchematicDescription} from './interface';
import {BaseException} from '../exception/exception';



export class UnknownSchematicNameException extends BaseException {
  constructor(collection: string, name: string) {
    super(`Schematic named "${name}" could not be found in collection "${collection}".`);
  }
}
export class InvalidSchematicException extends BaseException {
  constructor(name: string) { super(`Invalid schematic: "${name}".`); }
}


export class CollectionImpl implements Collection {
  private _schematics: { [name: string]: (options: any) => Schematic | null } = {};

  constructor(private _description: CollectionDescription,
              private _engine: SchematicEngine) {
    Object.keys(this._description.schematics).forEach(name => {
      this._schematics[name] = (options: any) => this._engine.createSchematic(name, this, options);
    });
  }

  get engine() { return this._engine; }
  get name() { return this._description.name || '<unknown>'; }
  get path() { return this._description.path || '<unknown>'; }

  listSchematicNames(): string[] {
    return Object.keys(this._schematics);
  }

  getSchematicDescription(name: string): SchematicDescription | null {
    if (!(name in this._description.schematics)) {
      return null;
    }
    return this._description.schematics[name];
  }

  createSchematic<T>(name: string, options: T): Schematic {
    if (!(name in this._schematics)) {
      throw new UnknownSchematicNameException(this.name, name);
    }

    const schematic = this._schematics[name](options);
    if (!schematic) {
      throw new InvalidSchematicException(name);
    }
    return schematic;
  }
}
