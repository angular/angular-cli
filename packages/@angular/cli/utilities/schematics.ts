/**
 * Refer to the angular shematics library to let the dependency validator
 * know it is used..
 *
 * require('@schematics/angular')
 */

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
  validateOptionsWithSchema
} from '@angular-devkit/schematics/tools';
import { SchemaClassFactory } from '@ngtools/json-schema';

const SilentError = require('silent-error');

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
  const engineHost = getEngineHost();
  const engine = getEngine();

  // Add support for schemaJson.
  engineHost.registerOptionsTransform((schematic: FileSystemSchematicDesc, options: any) => {
    if (schematic.schema) {
      const SchemaMetaClass = SchemaClassFactory<any>(schematic.schemaJson!);
      const schemaClass = new SchemaMetaClass(options);
      return schemaClass.$$root();
    }
    return options;
  });

  const collection = engine.createCollection(collectionName);

  if (collection === null) {
    throw new SilentError(`Invalid collection (${collectionName}).`);
  }
  return collection;
}

export function getSchematic(collection: Collection<any, any>,
                             schematicName: string): Schematic<any, any> {
  return collection.createSchematic(schematicName);
}
