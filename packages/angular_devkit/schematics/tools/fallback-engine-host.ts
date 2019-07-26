/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Observable, of as observableOf, throwError } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { Url } from 'url';
import {
  Collection,
  CollectionDescription,
  EngineHost,
  RuleFactory,
  SchematicDescription,
  Source,
  TaskExecutor,
  TypedSchematicContext,
  UnknownCollectionException,
  UnregisteredTaskException,
} from '../src';


export type FallbackCollectionDescription = {
  host: EngineHost<{}, {}>;
  description: CollectionDescription<{}>;
};
export type FallbackSchematicDescription = {
  description: SchematicDescription<{}, {}>;
};
export type FallbackContext =
  TypedSchematicContext<FallbackCollectionDescription, FallbackSchematicDescription>;


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
  ): SchematicDescription<FallbackCollectionDescription, FallbackSchematicDescription> | null {
    const description = collection.host.createSchematicDescription(name, collection.description);
    if (!description) {
      return null;
    }

    return { name, collection, description };
  }

  getSchematicRuleFactory<OptionT extends object>(
    schematic: SchematicDescription<FallbackCollectionDescription, FallbackSchematicDescription>,
    collection: CollectionDescription<FallbackCollectionDescription>): RuleFactory<OptionT> {
    return collection.host.getSchematicRuleFactory(schematic.description, collection.description);
  }

  createSourceFromUrl(
    url: Url,
    context: FallbackContext,
  ): Source | null {
    return context.schematic.collection.description.host.createSourceFromUrl(url, context);
  }

  transformOptions<OptionT extends object, ResultT extends object>(
    schematic: SchematicDescription<FallbackCollectionDescription, FallbackSchematicDescription>,
    options: OptionT,
    context?: FallbackContext,
  ): Observable<ResultT> {
    // tslint:disable-next-line:no-any https://github.com/ReactiveX/rxjs/issues/3989
    return ((observableOf(options) as any)
      .pipe(...this._hosts
        .map(host => mergeMap((opt: {}) => host.transformOptions(schematic, opt, context))),
      )
    ) as {} as Observable<ResultT>;
  }

  transformContext(context: FallbackContext): FallbackContext {
    let result = context;

    this._hosts.forEach(host => {
      result = (host.transformContext(result) || result) as FallbackContext;
    });

    return result;
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

  createTaskExecutor(name: string): Observable<TaskExecutor> {
    for (const host of this._hosts) {
      if (host.hasTaskExecutor(name)) {
        return host.createTaskExecutor(name);
      }
    }

    return throwError(new UnregisteredTaskException(name));
  }

  hasTaskExecutor(name: string): boolean {
    for (const host of this._hosts) {
      if (host.hasTaskExecutor(name)) {
        return true;
      }
    }

    return false;
  }

}
