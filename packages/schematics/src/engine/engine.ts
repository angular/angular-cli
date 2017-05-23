import {CollectionImpl} from './collection';
import {
  Collection,
  Engine, EngineHost,
  ProtocolHandler,
  Schematic,
  SchematicContext,
  Source
} from './interface';
import {SchematicImpl} from './schematic';
import {BaseException} from '../exception/exception';
import {empty} from '../tree/static';

import {Url, parse, format} from 'url';


export class InvalidSourceUrlException extends BaseException {
  constructor(url: string) { super(`Invalid source url: "${url}".`); }
}
export class UnknownUrlSourceProtocol extends BaseException {
  constructor(url: string) { super(`Unknown Protocol on url "${url}".`); }
}


export class SchematicEngine implements Engine {
  private _protocolMap = new Map<string, ProtocolHandler>();

  constructor(private _options: EngineHost) {
    // Default implementations.
    this._protocolMap.set('null', () => {
      return () => empty();
    });
    this._protocolMap.set('', (url: Url) => {
      // Make a copy, change the protocol.
      const fileUrl = parse(format(url));
      fileUrl.protocol = 'file:';
      return (context: SchematicContext) => context.engine.createSourceFromUrl(fileUrl)(context);
    });
  }

  createCollection(name: string): Collection | null {
    const description = this._options.loadCollection(name);
    if (!description) {
      return null;
    }

    return new CollectionImpl(description, this);
  }

  createSchematic<T>(name: string, collection: Collection, options: T): Schematic | null {
    const description = this._options.loadSchematic<T>(name, collection, options);
    if (!description) {
      return null;
    }

    return new SchematicImpl(description, collection);
  }

  registerUrlProtocolHandler(protocol: string, handler: ProtocolHandler) {
    this._protocolMap.set(protocol, handler);
  }

  createSourceFromUrl(url: Url): Source {
    const protocol = (url.protocol || '').replace(/:$/, '');
    const handler = this._protocolMap.get(protocol);
    if (!handler) {
      throw new UnknownUrlSourceProtocol(url.toString());
    }
    return handler(url);
  }
}
