/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-any
// tslint:disable:no-implicit-dependencies
import { normalize, virtualFs } from '@angular-devkit/core';
import { FileSystemTree, HostSink, SchematicEngine } from '@angular-devkit/schematics';
import { FileSystemEngineHost } from '@angular-devkit/schematics/tools';
import * as path from 'path';
import { of as observableOf } from 'rxjs/observable/of';


describe('FileSystemEngineHost', () => {
  const devkitRoot = (global as any)._DevKitRoot;
  const root = path.join(
    devkitRoot,
    'tests/@angular_devkit/schematics/tools/file-system-engine-host',
  );

  it('works', () => {
    const engineHost = new FileSystemEngineHost(root);
    const engine = new SchematicEngine(engineHost);

    const testCollection = engine.createCollection('works');
    const schematic1 = engine.createSchematic('schematic1', testCollection);

    expect(schematic1.description.name).toBe('schematic1');
  });

  it('understands aliases', () => {
    const engineHost = new FileSystemEngineHost(root);
    const engine = new SchematicEngine(engineHost);

    const testCollection = engine.createCollection('aliases');
    const schematic1 = engine.createSchematic('alias1', testCollection);

    expect(schematic1).not.toBeNull();
    expect(schematic1.description.name).toBe('schematic1');
  });

  it('lists schematics but not aliases', () => {
    const engineHost = new FileSystemEngineHost(root);
    const engine = new SchematicEngine(engineHost);

    const testCollection = engine.createCollection('aliases');
    const names = testCollection.listSchematicNames();

    expect(names).not.toBeNull();
    expect(names[0]).toBe('schematic1');
    expect(names[1]).toBe('schematic2');
  });

  it('extends a collection with string', () => {
    const engineHost = new FileSystemEngineHost(root);
    const engine = new SchematicEngine(engineHost);

    const testCollection = engine.createCollection('extends-basic-string');

    expect(testCollection.baseDescriptions).not.toBeUndefined();
    expect(testCollection.baseDescriptions
           && testCollection.baseDescriptions.length).toBe(1);

    const schematic1 = engine.createSchematic('schematic1', testCollection);

    expect(schematic1).not.toBeNull();
    expect(schematic1.description.name).toBe('schematic1');

    const schematic2 = engine.createSchematic('schematic2', testCollection);

    expect(schematic2).not.toBeNull();
    expect(schematic2.description.name).toBe('schematic2');

    const names = testCollection.listSchematicNames();

    expect(names.length).toBe(2);
  });

  it('extends a collection with array', () => {
    const engineHost = new FileSystemEngineHost(root);
    const engine = new SchematicEngine(engineHost);

    const testCollection = engine.createCollection('extends-basic');

    expect(testCollection.baseDescriptions).not.toBeUndefined();
    expect(testCollection.baseDescriptions
           && testCollection.baseDescriptions.length).toBe(1);

    const schematic1 = engine.createSchematic('schematic1', testCollection);

    expect(schematic1).not.toBeNull();
    expect(schematic1.description.name).toBe('schematic1');

    const schematic2 = engine.createSchematic('schematic2', testCollection);

    expect(schematic2).not.toBeNull();
    expect(schematic2.description.name).toBe('schematic2');

    const names = testCollection.listSchematicNames();

    expect(names.length).toBe(2);
  });

  it('extends a collection with full depth', () => {
    const engineHost = new FileSystemEngineHost(root);
    const engine = new SchematicEngine(engineHost);

    const testCollection = engine.createCollection('extends-deep');

    expect(testCollection.baseDescriptions).not.toBeUndefined();
    expect(testCollection.baseDescriptions
           && testCollection.baseDescriptions.length).toBe(2);

    const schematic1 = engine.createSchematic('schematic1', testCollection);

    expect(schematic1).not.toBeNull();
    expect(schematic1.description.name).toBe('schematic1');

    const schematic2 = engine.createSchematic('schematic2', testCollection);

    expect(schematic2).not.toBeNull();
    expect(schematic2.description.name).toBe('schematic2');

    const names = testCollection.listSchematicNames();

    expect(names.length).toBe(2);
  });

  it('replaces base schematics when extending', () => {
    const engineHost = new FileSystemEngineHost(root);
    const engine = new SchematicEngine(engineHost);

    const testCollection = engine.createCollection('extends-replace');

    expect(testCollection.baseDescriptions).not.toBeUndefined();
    expect(testCollection.baseDescriptions
           && testCollection.baseDescriptions.length).toBe(1);

    const schematic1 = engine.createSchematic('schematic1', testCollection);

    expect(schematic1).not.toBeNull();
    expect(schematic1.description.name).toBe('schematic1');
    expect(schematic1.description.description).toBe('replaced');

    const names = testCollection.listSchematicNames();

    expect(names).not.toBeNull();
    expect(names.length).toBe(1);
  });

  it('extends multiple collections', () => {
    const engineHost = new FileSystemEngineHost(root);
    const engine = new SchematicEngine(engineHost);

    const testCollection = engine.createCollection('extends-multiple');

    expect(testCollection.baseDescriptions).not.toBeUndefined();
    expect(testCollection.baseDescriptions
           && testCollection.baseDescriptions.length).toBe(4);

    const schematic1 = engine.createSchematic('schematic1', testCollection);

    expect(schematic1).not.toBeNull();
    expect(schematic1.description.name).toBe('schematic1');
    expect(schematic1.description.description).toBe('replaced');

    const schematic2 = engine.createSchematic('schematic2', testCollection);

    expect(schematic2).not.toBeNull();
    expect(schematic2.description.name).toBe('schematic2');

    const names = testCollection.listSchematicNames();

    expect(names).not.toBeNull();
    expect(names.length).toBe(2);
  });

  it('errors on simple circular collections', () => {
    const engineHost = new FileSystemEngineHost(root);
    const engine = new SchematicEngine(engineHost);

    expect(() => engine.createCollection('extends-circular')).toThrow();
  });

  it('errors on complex circular collections', () => {
    const engineHost = new FileSystemEngineHost(root);
    const engine = new SchematicEngine(engineHost);

    expect(() => engine.createCollection('extends-circular-multiple')).toThrow();
  });

  it('errors on deep circular collections', () => {
    const engineHost = new FileSystemEngineHost(root);
    const engine = new SchematicEngine(engineHost);

    expect(() => engine.createCollection('extends-circular-deep')).toThrow();
  });

  it('errors on invalid aliases', () => {
    const engineHost = new FileSystemEngineHost(root);
    const engine = new SchematicEngine(engineHost);

    expect(() => engine.createCollection('invalid-aliases')).toThrow();
  });

  it('errors on invalid aliases (2)', () => {
    const engineHost = new FileSystemEngineHost(root);
    const engine = new SchematicEngine(engineHost);

    expect(() => engine.createCollection('invalid-aliases-2')).toThrow();
  });

  it('does not list hidden schematics', () => {
    const engineHost = new FileSystemEngineHost(root);
    const engine = new SchematicEngine(engineHost);
    const collection = engine.createCollection('hidden-schematics');

    expect(collection.listSchematicNames()).toEqual([
      'schematic-1',
      'schematic-2',
    ]);
  });

  it('does not list private schematics', () => {
    const engineHost = new FileSystemEngineHost(root);
    const engine = new SchematicEngine(engineHost);
    const collection = engine.createCollection('private-schematics');

    expect(collection.listSchematicNames()).toEqual([
      'schematic-1',
      'schematic-2',
    ]);
  });

  it('cannot instanciate a private schematic', () => {
    const engineHost = new FileSystemEngineHost(root);
    const engine = new SchematicEngine(engineHost);

    const collection = engine.createCollection('private-schematics');
    expect(() => engine.createSchematic('schematic-1', collection)).not.toThrow();
    expect(() => engine.createSchematic('private-schematic', collection)).toThrow();
    expect(() => collection.createSchematic('private-schematic')).toThrow();
  });

  it('allows extra properties on schema', done => {
    const engineHost = new FileSystemEngineHost(root);
    const engine = new SchematicEngine(engineHost);
    const host = new virtualFs.test.TestHost();

    const collection = engine.createCollection('extra-properties');
    const schematic = collection.createSchematic('schematic1');

    schematic.call({}, observableOf(new FileSystemTree(host))).toPromise()
      .then(tree => {
        return new HostSink(host).commit(tree).toPromise();
      })
      .then(() => {
        expect(host.files as string[]).toEqual(['/extra-schematic']);
        expect(host.sync.read(normalize('/extra-schematic')).toString())
          .toEqual('extra-collection');
      })
      .then(done, done.fail);
  });
});
