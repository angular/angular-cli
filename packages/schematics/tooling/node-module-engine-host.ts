import {ExportStringRef} from './export-ref';
import {FileSystemHost} from './file-system-host';
import {
  Collection,
  CollectionDescription,
  EngineHost,
  FileSystemTree,
  RuleFactory,
  SchematicDescription,
  Source,
  TypedSchematicContext,
} from '../src/index';

import {dirname, join, resolve} from 'path';
import {Url} from 'url';


export interface NodeModulesCollectionDescription {
  readonly path: string;
  readonly version?: string;
  readonly schematics: { [name: string]: NodeModulesSchematicDescription };
}


export interface NodeModulesSchematicDescription {
  readonly path: string;
  readonly factory: string;
  readonly description: string;
  readonly schema?: string;

  readonly schemaJson?: Object;
}


/**
 * Used to simplify typings.
 */
export declare type NodeModulesCollection
    = Collection<NodeModulesCollectionDescription, NodeModulesSchematicDescription>;
export declare type NodeModulesCollectionDesc
    = CollectionDescription<NodeModulesCollectionDescription>;
export declare type NodeModulesSchematicDesc
    = SchematicDescription<NodeModulesCollectionDescription, NodeModulesSchematicDescription>;
export declare type NodeModulesSchematicContext
    = TypedSchematicContext<NodeModulesCollectionDescription, NodeModulesSchematicDescription>;



/**
 * A simple EngineHost that uses NodeModules to resolve collections.
 */
export class NodeModulesEngineHost implements EngineHost<NodeModulesCollectionDescription,
                                                         NodeModulesSchematicDescription> {
  constructor(_pwd?: string) {}

  listSchematics(collection: NodeModulesCollection) {
    return Object.keys(collection.description.schematics);
  }

  /**
   *
   * @param name
   * @return {{path: string}}
   */
  createCollectionDescription(name: string): NodeModulesCollectionDesc | null {
    try {
      const pkgJsonSchematics = require(join(name, 'package.json'))['schematics'];

      if (!pkgJsonSchematics) {
        return null;
      }

      const path = join(name, pkgJsonSchematics);
      const description: CollectionDescription<NodeModulesCollectionDescription> = require(path);
      if (!description.name) {
        return null;
      }

      return {
        ...description,
        path: require.resolve(path),
      };
    } catch (e) {
      return null;
    }
  }

  createSchematicDescription(
      name: string, collection: NodeModulesCollectionDesc): NodeModulesSchematicDesc | null {
    if (!(name in collection.schematics)) {
      return null;
    }

    const collectionPath = dirname(collection.path);
    const description = collection.schematics[name];

    if (!description) {
      return null;
    }

    // Use any on this ref as we don't have the OptionT here, but we don't need it (we only need
    // the path).
    const ref = new ExportStringRef<RuleFactory<any>>(description.factory, collectionPath);
    let schema = description.schema;
    let schemaJson = undefined;
    if (schema) {
      const schemaRef = new ExportStringRef<Object>(schema, collectionPath, false);
      schema = schemaRef.module;
      schemaJson = schemaRef.ref;
    }

    // Validate the schema.
    return {
      ...description,
      schema,
      schemaJson,
      name,
      path: ref.path,
      collection
    };
  }

  createSourceFromUrl(url: Url): Source | null {
    switch (url.protocol) {
      case '':
      case 'file:':
        return (context: NodeModulesSchematicContext) => {
          // Resolve all file:///a/b/c/d from the schematic's own path, and not the current
          // path.
          const root = resolve(context.schematic.description.path, url.path);
          return new FileSystemTree(new FileSystemHost(root), true);
        };
    }

    return null;
  }

  getSchematicRuleFactory<OptionT>(
    schematic: NodeModulesSchematicDesc,
    collection: NodeModulesCollectionDesc): RuleFactory<OptionT> {

    const collectionPath = dirname(collection.path);
    const ref = new ExportStringRef<RuleFactory<OptionT>>(schematic.factory, collectionPath);

    return ref.ref;
  }

}
