import {MergeStrategy, Tree} from '../tree/interface';

import {Observable} from 'rxjs/Observable';
import {Url} from 'url';


export interface EngineHost {
  loadCollection(name: string): CollectionDescription | null;
  loadSchematic<T>(name: string,
                   collection: Collection,
                   options: T): ResolvedSchematicDescription | null;
}


export interface Schematic {
  readonly name: string;
  readonly description: string;
  readonly path: string;
  readonly collection: Collection;

  call(host: Observable<Tree>, parentContext: Partial<SchematicContext>): Observable<Tree>;
}


export interface ProtocolHandler {
  (url: Url): Source;
}



export interface Engine {
  createCollection(name: string): Collection | null;
  createSchematic<T>(name: string, collection: Collection, options: T): Schematic | null;
  registerUrlProtocolHandler(protocol: string, handler: ProtocolHandler): void;
  createSourceFromUrl(url: Url): Source;
}


export interface Collection {
  readonly engine: Engine;
  readonly name: string;
  readonly path: string;

  listSchematicNames(): string[];
  getSchematicDescription(name: string): SchematicDescription | null;
  createSchematic<T>(name: string, options: T): Schematic;
}


export interface SchematicContext {
  readonly engine: Engine;
  readonly schematic: Schematic;
  readonly host: Observable<Tree>;
  readonly strategy: MergeStrategy;
}


export interface CollectionDescription {
  readonly path: string;
  readonly name?: string;
  readonly version?: string;
  readonly schematics: { [name: string]: SchematicDescription };
}

export interface SchematicDescription {
  readonly factory: string;
  readonly description: string;
  readonly schema?: string;
}


export interface ResolvedSchematicDescription extends SchematicDescription {
  readonly name: string;
  readonly path: string;
  readonly rule: Rule;
}

export type RuleFactory<T> = (options: T) => Rule;

export type Source = (context: SchematicContext) => Tree | Observable<Tree>;
export type Rule = (tree: Tree, context: SchematicContext) => Tree | Observable<Tree>;
