/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { BaseException, JsonObject, normalize, virtualFs } from '@angular-devkit/core';
import { NodeJsSyncHost } from '@angular-devkit/core/node';
import { existsSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { Url } from 'node:url';
import { Observable, isObservable, lastValueFrom, from as observableFrom, throwError } from 'rxjs';
import {
  HostCreateTree,
  RuleFactory,
  Source,
  TaskExecutor,
  TaskExecutorFactory,
  UnregisteredTaskException,
} from '../src';
import {
  FileSystemCollectionDesc,
  FileSystemEngineHost,
  FileSystemSchematicContext,
  FileSystemSchematicDesc,
  FileSystemSchematicDescription,
} from './description';
import { readJsonFile } from './file-system-utility';

export declare type OptionTransform<T extends object | null, R extends object> = (
  schematic: FileSystemSchematicDescription,
  options: T,
  context?: FileSystemSchematicContext,
) => Observable<R> | PromiseLike<R> | R;
export declare type ContextTransform = (
  context: FileSystemSchematicContext,
) => FileSystemSchematicContext;

export class CollectionCannotBeResolvedException extends BaseException {
  constructor(name: string) {
    super(`Collection ${JSON.stringify(name)} cannot be resolved.`);
  }
}
export class InvalidCollectionJsonException extends BaseException {
  constructor(_name: string, path: string, jsonException?: Error) {
    let msg = `Collection JSON at path ${JSON.stringify(path)} is invalid.`;

    if (jsonException) {
      msg = `${msg} ${jsonException.message}`;
    }

    super(msg);
  }
}
export class SchematicMissingFactoryException extends BaseException {
  constructor(name: string) {
    super(`Schematic ${JSON.stringify(name)} is missing a factory.`);
  }
}
export class FactoryCannotBeResolvedException extends BaseException {
  constructor(name: string) {
    super(`Schematic ${JSON.stringify(name)} cannot resolve the factory.`);
  }
}
export class CollectionMissingSchematicsMapException extends BaseException {
  constructor(name: string) {
    super(`Collection "${name}" does not have a schematics map.`);
  }
}
export class CollectionMissingFieldsException extends BaseException {
  constructor(name: string) {
    super(`Collection "${name}" is missing fields.`);
  }
}
export class SchematicMissingFieldsException extends BaseException {
  constructor(name: string) {
    super(`Schematic "${name}" is missing fields.`);
  }
}
export class SchematicMissingDescriptionException extends BaseException {
  constructor(name: string) {
    super(`Schematics "${name}" does not have a description.`);
  }
}
export class SchematicNameCollisionException extends BaseException {
  constructor(name: string) {
    super(
      `Schematics/alias ${JSON.stringify(name)} collides with another alias or schematic` +
        ' name.',
    );
  }
}

/**
 * A EngineHost base class that uses the file system to resolve collections. This is the base of
 * all other EngineHost provided by the tooling part of the Schematics library.
 */
export abstract class FileSystemEngineHostBase implements FileSystemEngineHost {
  protected abstract _resolveCollectionPath(name: string, requester?: string): string;
  protected abstract _resolveReferenceString(
    name: string,
    parentPath: string,
    collectionDescription: FileSystemCollectionDesc,
  ): { ref: RuleFactory<{}>; path: string } | null;
  protected abstract _transformCollectionDescription(
    name: string,
    desc: Partial<FileSystemCollectionDesc>,
  ): FileSystemCollectionDesc;
  protected abstract _transformSchematicDescription(
    name: string,
    collection: FileSystemCollectionDesc,
    desc: Partial<FileSystemSchematicDesc>,
  ): FileSystemSchematicDesc;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _transforms: OptionTransform<any, any>[] = [];
  private _contextTransforms: ContextTransform[] = [];
  private _taskFactories = new Map<string, () => Observable<TaskExecutor>>();

  listSchematicNames(collection: FileSystemCollectionDesc, includeHidden?: boolean) {
    const schematics: string[] = [];
    for (const key of Object.keys(collection.schematics)) {
      const schematic = collection.schematics[key];

      if ((schematic.hidden && !includeHidden) || schematic.private) {
        continue;
      }

      // If extends is present without a factory it is an alias, do not return it
      //   unless it is from another collection.
      if (!schematic.extends || schematic.factory) {
        schematics.push(key);
      } else if (schematic.extends && schematic.extends.indexOf(':') !== -1) {
        schematics.push(key);
      }
    }

    return schematics;
  }

  registerOptionsTransform<T extends object | null, R extends object>(t: OptionTransform<T, R>) {
    this._transforms.push(t);
  }

  registerContextTransform(t: ContextTransform) {
    this._contextTransforms.push(t);
  }

  /**
   *
   * @param name
   * @return {{path: string}}
   */
  createCollectionDescription(
    name: string,
    requester?: FileSystemCollectionDesc,
  ): FileSystemCollectionDesc {
    const path = this._resolveCollectionPath(name, requester?.path);
    const jsonValue = readJsonFile(path);
    if (!jsonValue || typeof jsonValue != 'object' || Array.isArray(jsonValue)) {
      throw new InvalidCollectionJsonException(name, path);
    }

    // normalize extends property to an array
    if (typeof jsonValue['extends'] === 'string') {
      jsonValue['extends'] = [jsonValue['extends']];
    }

    const description = this._transformCollectionDescription(name, {
      ...jsonValue,
      path,
    });
    if (!description || !description.name) {
      throw new InvalidCollectionJsonException(name, path);
    }

    // Validate aliases.
    const allNames = Object.keys(description.schematics);
    for (const schematicName of Object.keys(description.schematics)) {
      const aliases = description.schematics[schematicName].aliases || [];

      for (const alias of aliases) {
        if (allNames.indexOf(alias) != -1) {
          throw new SchematicNameCollisionException(alias);
        }
      }

      allNames.push(...aliases);
    }

    return description;
  }

  createSchematicDescription(
    name: string,
    collection: FileSystemCollectionDesc,
  ): FileSystemSchematicDesc | null {
    // Resolve aliases first.
    for (const schematicName of Object.keys(collection.schematics)) {
      const schematicDescription = collection.schematics[schematicName];
      if (schematicDescription.aliases && schematicDescription.aliases.indexOf(name) != -1) {
        name = schematicName;
        break;
      }
    }

    if (!(name in collection.schematics)) {
      return null;
    }

    const collectionPath = dirname(collection.path);
    const partialDesc: Partial<FileSystemSchematicDesc> | null = collection.schematics[name];
    if (!partialDesc) {
      return null;
    }

    if (partialDesc.extends) {
      const index = partialDesc.extends.indexOf(':');
      const collectionName = index !== -1 ? partialDesc.extends.slice(0, index) : null;
      const schematicName =
        index === -1 ? partialDesc.extends : partialDesc.extends.slice(index + 1);

      if (collectionName !== null) {
        const extendCollection = this.createCollectionDescription(collectionName);

        return this.createSchematicDescription(schematicName, extendCollection);
      } else {
        return this.createSchematicDescription(schematicName, collection);
      }
    }
    // Use any on this ref as we don't have the OptionT here, but we don't need it (we only need
    // the path).
    if (!partialDesc.factory) {
      throw new SchematicMissingFactoryException(name);
    }
    const resolvedRef = this._resolveReferenceString(
      partialDesc.factory,
      collectionPath,
      collection,
    );
    if (!resolvedRef) {
      throw new FactoryCannotBeResolvedException(name);
    }

    let schema = partialDesc.schema;
    let schemaJson: JsonObject | undefined = undefined;
    if (schema) {
      if (!isAbsolute(schema)) {
        schema = join(collectionPath, schema);
      }
      schemaJson = readJsonFile(schema) as JsonObject;
    }

    // The schematic path is used to resolve URLs.
    // We should be able to just do `dirname(resolvedRef.path)` but for compatibility with
    // Bazel under Windows this directory needs to be resolved from the collection instead.
    // This is needed because on Bazel under Windows the data files (such as the collection or
    // url files) are not in the same place as the compiled JS.
    const maybePath = join(collectionPath, partialDesc.factory);
    const path =
      existsSync(maybePath) && statSync(maybePath).isDirectory() ? maybePath : dirname(maybePath);

    return this._transformSchematicDescription(name, collection, {
      ...partialDesc,
      schema,
      schemaJson,
      name,
      path,
      factoryFn: resolvedRef.ref,
      collection,
    });
  }

  createSourceFromUrl(url: Url): Source | null {
    switch (url.protocol) {
      case null:
      case 'file:':
        return (context) => {
          // Check if context has necessary FileSystemSchematicContext path property
          const fileDescription = context.schematic.description as { path?: string };
          if (fileDescription.path === undefined) {
            throw new Error(
              'Unsupported schematic context. Expected a FileSystemSchematicContext.',
            );
          }

          // Resolve all file:///a/b/c/d from the schematic's own path, and not the current
          // path.
          const root = normalize(resolve(fileDescription.path, url.path || ''));

          return new HostCreateTree(new virtualFs.ScopedHost(new NodeJsSyncHost(), root));
        };
    }

    return null;
  }

  transformOptions<OptionT extends object, ResultT extends object>(
    schematic: FileSystemSchematicDesc,
    options: OptionT,
    context?: FileSystemSchematicContext,
  ): Observable<ResultT> {
    const transform = async () => {
      let transformedOptions = options;
      for (const transformer of this._transforms) {
        const transformerResult = transformer(schematic, transformedOptions, context);
        transformedOptions = await (isObservable(transformerResult)
          ? lastValueFrom(transformerResult)
          : transformerResult);
      }

      return transformedOptions;
    };

    return observableFrom(transform()) as unknown as Observable<ResultT>;
  }

  transformContext(context: FileSystemSchematicContext): FileSystemSchematicContext {
    return this._contextTransforms.reduce((acc, curr) => curr(acc), context);
  }

  getSchematicRuleFactory<OptionT extends object>(
    schematic: FileSystemSchematicDesc,
    _collection: FileSystemCollectionDesc,
  ): RuleFactory<OptionT> {
    return schematic.factoryFn;
  }

  registerTaskExecutor<T>(factory: TaskExecutorFactory<T>, options?: T): void {
    this._taskFactories.set(factory.name, () => observableFrom(factory.create(options)));
  }

  createTaskExecutor(name: string): Observable<TaskExecutor> {
    const factory = this._taskFactories.get(name);
    if (factory) {
      return factory();
    }

    return throwError(new UnregisteredTaskException(name));
  }

  hasTaskExecutor(name: string): boolean {
    return this._taskFactories.has(name);
  }
}
