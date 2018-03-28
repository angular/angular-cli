/**
 * Refer to the angular shematics library to let the dependency validator
 * know it is used..
 *
 * require('@schematics/angular')
 */

import { SchemaClassFactory } from '@ngtools/json-schema';

// devkit/local bridge types and imports.
import {
  Collection as CollectionT,
  Engine as EngineT,
  Schematic as SchematicT,
} from '@angular-devkit/schematics';
// TODO: schematics/tools needs to be a secondary entry point.
import {
  FileSystemCollectionDesc,
  FileSystemSchematicDesc,
  NodeModulesEngineHost,
  validateOptionsWithSchema
} from '@angular-devkit/schematics/tools';
import { core, schematics } from '../utilities/devkit-local-bridge';
const { schema } = core;
const { SchematicEngine, formats } = schematics;

const SilentError = require('silent-error');

const engineHost = new NodeModulesEngineHost();
const engine: EngineT<FileSystemCollectionDesc, FileSystemSchematicDesc>
  = new SchematicEngine(engineHost);

// Add support for schemaJson.
const registry = new schema.CoreSchemaRegistry(formats.standardFormats);
engineHost.registerOptionsTransform(validateOptionsWithSchema(registry));


export function getEngineHost() {
  return engineHost;
}
export function getEngine(): EngineT<FileSystemCollectionDesc, FileSystemSchematicDesc> {
  return engine;
}


export function getCollection(collectionName: string): CollectionT<any, any> {
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

export function getSchematic(collection: CollectionT<any, any>,
  schematicName: string,
  allowPrivate?: boolean): SchematicT<any, any> {
  return collection.createSchematic(schematicName, allowPrivate);
}
