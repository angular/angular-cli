/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  CollectionDescription,
  EngineHost,
  RuleFactory,
  SchematicDescription,
  Source, TypedSchematicContext,
  UnknownCollectionException,
} from '@angular-devkit/schematics';
import { Url } from 'url';


export type FallbackCollectionDescription = {
  host: EngineHost<{}, {}>;
  description: CollectionDescription<{}>;
};
export type FallbackSchematicDescription = {
  description: SchematicDescription<{}, {}>;
};
export declare type OptionTransform<T extends object, R extends object> = (
  schematic: SchematicDescription<FallbackCollectionDescription, FallbackSchematicDescription>,
  options: T,
) => R;


/**
 * An EngineHost that support multiple hosts in a fallback configuration. If a host does not
 * have a collection/schematics, use the following host before giving up.
 */
export class FallbackEngineHost implements EngineHost<{}, {}> {
  private _hosts: EngineHost<{}, {}>[] = [];
  private _transforms: OptionTransform<object, object>[] = [];

  constructor() {}

  addHost<CollectionT extends object, SchematicT extends object>(
    host: EngineHost<CollectionT, SchematicT>,
  ) {
    this._hosts.push(host);
  }

  registerOptionsTransform<T extends object, R extends object>(t: OptionTransform<T, R>) {
    this._transforms.push(t);
  }

  createCollectionDescription(name: string): CollectionDescription<FallbackCollectionDescription> {
    for (const host of this._hosts) {
      try {
        const description = host.createCollectionDescription(name);

        return { name, host, description };
      } catch (_) {
      }
    }

    throw new UnknownCollectionException(name);
  }

  createSchematicDescription(
    name: string,
    collection: CollectionDescription<FallbackCollectionDescription>,
  ): SchematicDescription<FallbackCollectionDescription, FallbackSchematicDescription> {
    const description = collection.host.createSchematicDescription(name, collection.description);

    return { name, collection, description };
  }

  getSchematicRuleFactory<OptionT extends object>(
    schematic: SchematicDescription<FallbackCollectionDescription, FallbackSchematicDescription>,
    collection: CollectionDescription<FallbackCollectionDescription>): RuleFactory<OptionT> {
    return collection.host.getSchematicRuleFactory(schematic.description, collection.description);
  }

  createSourceFromUrl(
    url: Url,
    context: TypedSchematicContext<FallbackCollectionDescription, FallbackSchematicDescription>,
  ): Source | null {
    return context.schematic.collection.description.host.createSourceFromUrl(url, context);
  }

  transformOptions<OptionT extends object, ResultT extends object>(
    schematic: SchematicDescription<FallbackCollectionDescription, FallbackSchematicDescription>,
    options: OptionT,
  ): ResultT {
    return this._transforms.reduce((acc: ResultT, t) => t(schematic, acc), options) as ResultT;
  }

  listSchematicNames(collection: CollectionDescription<FallbackCollectionDescription>): string[] {
    const allNames = new Set<string>();
    this._hosts.forEach(host => {
      try {
        host.listSchematicNames(collection.description).forEach(name => allNames.add(name));
      } catch (_) {}
    });

    return [...allNames];
  }
}
