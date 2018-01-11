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
  EngineHost,
  RuleFactory,
  SchematicDescription,
  Source,
  TypedSchematicContext,
  UnknownCollectionException,
} from '@angular-devkit/schematics';
import { Observable } from 'rxjs/Observable';
import { mergeMap } from 'rxjs/operators/mergeMap';
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
) => Observable<R>;


/**
 * An EngineHost that support multiple hosts in a fallback configuration. If a host does not
 * have a collection/schematics, use the following host before giving up.
 */
export class FallbackEngineHost implements EngineHost<{}, {}> {
  private _hosts: EngineHost<{}, {}>[] = [];

  constructor() {}

  addHost<CollectionT extends object, SchematicT extends object>(
    host: EngineHost<CollectionT, SchematicT>,
  ) {
    this._hosts.push(host);
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
  ): Observable<ResultT> {
    return (Observable.of(options)
      .pipe(...this._hosts.map(host => mergeMap(opt => host.transformOptions(schematic, opt))))
    ) as {} as Observable<ResultT>;
  }

  /**
   * @deprecated Use `listSchematicNames`.
   */
  listSchematics(
    collection: Collection<FallbackCollectionDescription, FallbackSchematicDescription>,
  ): string[] {
    return this.listSchematicNames(collection.description);
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
