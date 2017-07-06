/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  Collection,
  CollectionDescription,
  RuleFactory,
  SchematicDescription,
  TypedSchematicContext,
} from '@angular-devkit/schematics';


export interface FileSystemCollectionDescription {
  readonly path: string;
  readonly version?: string;
  readonly schematics: { [name: string]: FileSystemSchematicJsonDescription };
}


export interface FileSystemSchematicJsonDescription {
  readonly factory: string;
  readonly description: string;
  readonly schema?: string;
}

export interface FileSystemSchematicDescription extends FileSystemSchematicJsonDescription {
  // Processed by the EngineHost.
  readonly path: string;
  readonly schemaJson?: Object;
  // Using `any` here is okay because the type isn't resolved when we read this value,
  // but rather when the Engine asks for it.
  readonly factoryFn: RuleFactory<{}>;
}


/**
 * Used to simplify typings.
 */
export declare type FileSystemCollection
  = Collection<FileSystemCollectionDescription, FileSystemSchematicDescription>;
export declare type FileSystemCollectionDesc
  = CollectionDescription<FileSystemCollectionDescription>;
export declare type FileSystemSchematicDesc
  = SchematicDescription<FileSystemCollectionDescription, FileSystemSchematicDescription>;
export declare type FileSystemSchematicContext
  = TypedSchematicContext<FileSystemCollectionDescription, FileSystemSchematicDescription>;

