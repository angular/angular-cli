/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {MergeStrategy, Tree} from '../tree/interface';

import {Observable} from 'rxjs/Observable';
import {Url} from 'url';


/**
 * The description (metadata) of a collection. This type contains every information the engine
 * needs to run. The CollectionT type parameter contains additional metadata that you want to
 * store while remaining type-safe.
 */
export type CollectionDescription<CollectionT extends {}> = CollectionT & {
  readonly name: string;
};

/**
 * The description (metadata) of a schematic. This type contains every information the engine
 * needs to run. The SchematicT and CollectionT type parameters contain additional metadata
 * that you want to store while remaining type-safe.
 */
export type SchematicDescription<CollectionT extends {}, SchematicT extends {}> = SchematicT & {
  readonly collection: CollectionDescription<CollectionT>;
  readonly name: string;
};


/**
 * The Host for the Engine. Specifically, the piece of the tooling responsible for resolving
 * collections and schematics descriptions. The SchematicT and CollectionT type parameters contain
 * additional metadata that you want to store while remaining type-safe.
 */
export interface EngineHost<CollectionT extends {}, SchematicT extends {}> {
  createCollectionDescription(name: string): CollectionDescription<CollectionT> | null;
  createSchematicDescription(
      name: string,
      collection: CollectionDescription<CollectionT>):
        SchematicDescription<CollectionT, SchematicT> | null;
  getSchematicRuleFactory<OptionT>(
      schematic: SchematicDescription<CollectionT, SchematicT>,
      collection: CollectionDescription<CollectionT>): RuleFactory<OptionT>;
  createSourceFromUrl(url: Url): Source | null;

  readonly defaultMergeStrategy?: MergeStrategy;
}


/**
 * The root Engine for creating and running schematics and collections. Everything related to
 * a schematic execution starts from this interface.
 *
 * CollectionT is, by default, a generic Collection metadata type. This is used throughout the
 * engine typings so that you can use a type that's merged into descriptions, while being type-safe.
 *
 * SchematicT is a type that contains additional typing for the Schematic Description.
 */
export interface Engine<CollectionT extends {}, SchematicT extends {}> {
  createCollection(name: string): Collection<CollectionT, SchematicT>;
  createSchematic(
      name: string,
      collection: Collection<CollectionT, SchematicT>): Schematic<CollectionT, SchematicT>;
  createSourceFromUrl(url: Url): Source;

  readonly defaultMergeStrategy: MergeStrategy;
}


/**
 * A Collection as created by the Engine. This should be used by the tool to create schematics,
 * or by rules to create other schematics as well.
 */
export interface Collection<CollectionT, SchematicT> {
  readonly name: string;
  readonly description: CollectionDescription<CollectionT>;

  createSchematic(name: string): Schematic<CollectionT, SchematicT>;
}


/**
 * A Schematic as created by the Engine. This should be used by the tool to execute the main
 * schematics, or by rules to execute other schematics as well.
 */
export interface Schematic<CollectionT, SchematicT> {
  readonly description: SchematicDescription<CollectionT, SchematicT>;
  readonly collection: Collection<CollectionT, SchematicT>;

  call<T>(options: T, host: Observable<Tree>): Observable<Tree>;
}


/**
 * A SchematicContext. Contains information necessary for Schematics to execute some rules, for
 * example when using another schematics, as we need the engine and collection.
 */
export interface TypedSchematicContext<CollectionT, SchematicT> {
  readonly engine: Engine<CollectionT, SchematicT>;
  readonly schematic: Schematic<CollectionT, SchematicT>;
  readonly host: Observable<Tree>;
  readonly strategy: MergeStrategy;
}


/**
 * This is used by the Schematics implementations in order to avoid needing to have typing from
 * the tooling. Schematics are not specific to a tool.
 */
export type SchematicContext = TypedSchematicContext<any, any>;


/**
 * A rule factory, which is normally the way schematics are implemented. Returned by the tooling
 * after loading a schematic description.
 */
export type RuleFactory<T> = (options: T) => Rule;


/**
 * A source is a function that generates a Tree from a specific context. A rule transforms a tree
 * into another tree from a specific context. In both cases, an Observable can be returned if
 * the source or the rule are asynchronous. Only the last Tree generated in the observable will
 * be used though.
 *
 * We obfuscate the context of Source and Rule because the schematic implementation should not
 * know which types is the schematic or collection metadata, as they are both tooling specific.
 */
export type Source = (context: SchematicContext) => Tree | Observable<Tree>;
export type Rule = (tree: Tree, context: SchematicContext) => Tree | Observable<Tree>;
