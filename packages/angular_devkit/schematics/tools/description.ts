/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonObject } from '@angular-devkit/core';
import {
  Collection,
  CollectionDescription,
  Engine,
  EngineHost,
  RuleFactory,
  Schematic,
  SchematicDescription,
  TypedSchematicContext,
} from '../src';


export interface FileSystemCollectionDescription {
  readonly name: string;
  readonly path: string;
  readonly version?: string;
  readonly schematics: { [name: string]: FileSystemSchematicDesc };
}


export interface FileSystemSchematicJsonDescription {
  readonly aliases?: string[];
  readonly factory: string;
  readonly name: string;
  readonly collection: FileSystemCollectionDescription;
  readonly description: string;
  readonly schema?: string;
  readonly extends?: string;
}

export interface FileSystemSchematicDescription extends FileSystemSchematicJsonDescription {
  // Processed by the EngineHost.
  readonly path: string;
  readonly schemaJson?: JsonObject;
  // Using `any` here is okay because the type isn't resolved when we read this value,
  // but rather when the Engine asks for it.
  readonly factoryFn: RuleFactory<{}>;
}


/**
 * Used to simplify typings.
 */
export declare type FileSystemEngine
  = Engine<FileSystemCollectionDescription, FileSystemSchematicDescription>;
export declare type FileSystemEngineHost
  = EngineHost<FileSystemCollectionDescription, FileSystemSchematicDescription>;
export declare type FileSystemCollection
  = Collection<FileSystemCollectionDescription, FileSystemSchematicDescription>;
export declare type FileSystemSchematic
  = Schematic<FileSystemCollectionDescription, FileSystemSchematicDescription>;
export declare type FileSystemCollectionDesc
  = CollectionDescription<FileSystemCollectionDescription>;
export declare type FileSystemSchematicDesc
  = SchematicDescription<FileSystemCollectionDescription, FileSystemSchematicDescription>;
export declare type FileSystemSchematicContext
  = TypedSchematicContext<FileSystemCollectionDescription, FileSystemSchematicDescription>;
