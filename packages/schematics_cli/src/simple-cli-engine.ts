import {ExportStringRef} from './export-ref';

import {SchemaClassFactory} from '@ngtools/json-schema';
import {dirname, join} from 'path';
import {
  Collection,
  CollectionDescription,
  EngineHost,
  ResolvedSchematicDescription,
  RuleFactory,
} from '@angular/schematics';


/**
 * A simple EngineHost used by the CLI. When loading for a collection, it looks through the
 */
export class SimpleCliEngineHost implements EngineHost {
  /**
   *
   * @param collectionName
   * @return {{path: string}}
   */
  loadCollection(collectionName: string): CollectionDescription {
    let path = collectionName;
    try {
      const pkgJsonSchematics = require(join(collectionName, 'package.json'))['schematics'];
      path = join(collectionName, pkgJsonSchematics);
    } catch (e) {
    }

    const definition = require(path);
    path = require.resolve(path);
    return { ...definition, path };
  }

  loadSchematic<T>(name: string,
                   collection: Collection,
                   options: T): ResolvedSchematicDescription | null {
    const collectionPath = dirname(collection.path);
    const description = collection.getSchematicDescription(name);

    if (!description) {
      return null;
    }

    const ref = new ExportStringRef<RuleFactory<T>>(description.factory, collectionPath);

    // Validate the schema.
    if (description.schema) {
      const schema = new ExportStringRef<Object>(description.schema, collectionPath, false).ref;
      const SchemaMetaClass = SchemaClassFactory<T>(schema);
      const schemaClass = new SchemaMetaClass(options);
      return {name, path: ref.path, rule: ref.ref(schemaClass.$$root()), ...description};
    } else {
      return {name, path: ref.path, rule: ref.ref(options), ...description};
    }
  }
}
