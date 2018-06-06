/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// tslint:disable:no-global-tslint-disable no-any
import { schema } from '@angular-devkit/core';
import {
  Collection,
  Engine,
  Schematic,
  SchematicEngine,
  formats,
} from '@angular-devkit/schematics';
import {
  FileSystemCollectionDesc,
  FileSystemSchematicDesc,
  NodeModulesEngineHost,
  validateOptionsWithSchema,
} from '@angular-devkit/schematics/tools';

export class UnknownCollectionError extends Error {
  constructor(collectionName: string) {
    super(`Invalid collection (${collectionName}).`);
  }
}

const engineHost = new NodeModulesEngineHost();
const engine: Engine<FileSystemCollectionDesc, FileSystemSchematicDesc>
  = new SchematicEngine(engineHost);

// Add support for schemaJson.
const registry = new schema.CoreSchemaRegistry(formats.standardFormats);
engineHost.registerOptionsTransform(validateOptionsWithSchema(registry));


export function getEngineHost() {
  return engineHost;
}
export function getEngine(): Engine<FileSystemCollectionDesc, FileSystemSchematicDesc> {
  return engine;
}

export function getCollection(collectionName: string): Collection<any, any> {
  const engine = getEngine();
  const collection = engine.createCollection(collectionName);

  if (collection === null) {
    throw new UnknownCollectionError(collectionName);
  }

  return collection;
}

export function getSchematic(collection: Collection<any, any>,
                             schematicName: string,
                             allowPrivate?: boolean): Schematic<any, any> {
  return collection.createSchematic(schematicName, allowPrivate);
}
