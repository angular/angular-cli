/**
 * Refer to the angular shematics library to let the dependency validator
 * know it is used..
 *
 * require('@schematics/angular')
 */

import {
  Collection,
  Schematic,
  SchematicEngine,
} from '@angular-devkit/schematics';
import {
  FileSystemSchematicDesc,
  NodeModulesEngineHost
} from '@angular-devkit/schematics/tools';
import { SchemaClassFactory } from '@ngtools/json-schema';
import 'rxjs/add/operator/concatMap';
import 'rxjs/add/operator/map';

const SilentError = require('silent-error');

export function getEngineHost() {
  const engineHost = new NodeModulesEngineHost();
  return engineHost;
}

export function getCollection(collectionName: string): Collection<any, any> {
  const engineHost = getEngineHost();
  const engine = new SchematicEngine(engineHost);

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
