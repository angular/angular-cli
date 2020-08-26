/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-big-function
import {
  ProjectDefinition,
  ProjectDefinitionCollection,
  TargetDefinition,
  TargetDefinitionCollection,
} from './definitions';

describe('ProjectDefinitionCollection', () => {

  it('can be created without initial values or a listener', () => {
    const collection = new ProjectDefinitionCollection();

    expect(collection.size).toBe(0);
  });

  it('can be created with initial values', () => {
    const initial = {
      'my-app': { root: 'my-app', extensions: {}, targets: new TargetDefinitionCollection() },
      'my-lib': { root: 'my-lib', extensions: {}, targets: new TargetDefinitionCollection() },
    };

    initial['my-app'].targets.add({
      name: 'build',
      builder: 'build-builder',
    });

    const collection = new ProjectDefinitionCollection(initial);

    expect(collection.size).toBe(2);

    const app = collection.get('my-app');
    expect(app).not.toBeUndefined();
    if (app) {
      expect(app.root).toBe('my-app');
      expect(app.extensions).toEqual({});
      expect(app.targets.size).toBe(1);
      expect(app.targets.get('build')).not.toBeUndefined();
    }
    const lib = collection.get('my-lib');
    expect(lib).not.toBeUndefined();
    if (lib) {
      expect(lib.root).toBe('my-lib');
      expect(lib.extensions).toEqual({});
      expect(lib.targets).toBeTruthy();
    }
  });

  it('can be created with a listener', () => {
    const listener = () => { fail('listener should not execute on initialization'); };

    const collection = new ProjectDefinitionCollection(undefined, listener);

    expect(collection.size).toBe(0);
  });

  it('can be created with initial values and a listener', () => {
    const initial = {
      'my-app': { root: 'src/my-app', extensions: {}, targets: new TargetDefinitionCollection() },
      'my-lib': { root: 'src/my-lib', extensions: {}, targets: new TargetDefinitionCollection() },
    };

    initial['my-app'].targets.add({
      name: 'build',
      builder: 'build-builder',
    });

    const listener = () => { fail('listener should not execute on initialization'); };

    const collection = new ProjectDefinitionCollection(initial, listener);

    expect(collection.size).toBe(2);

    const app = collection.get('my-app');
    expect(app).not.toBeUndefined();
    if (app) {
      expect(app.root).toBe('src/my-app');
      expect(app.extensions).toEqual({});
      expect(app.targets.size).toBe(1);
      expect(app.targets.get('build')).not.toBeUndefined();
    }
    const lib = collection.get('my-lib');
    expect(lib).not.toBeUndefined();
    if (lib) {
      expect(lib.root).toBe('src/my-lib');
      expect(lib.extensions).toEqual({});
      expect(lib.targets).toBeTruthy();
    }
  });

  it('listens to an addition via set', () => {
    const listener = (name: string, action: string) => {
      expect(name).toBe('my-app');
      expect(action).toBe('add');
    };

    const collection = new ProjectDefinitionCollection(undefined, listener);

    collection.set(
      'my-app',
      { root: 'src/my-app', extensions: {}, targets: new TargetDefinitionCollection() },
    );
  });

  it('listens to an addition via add', () => {
    const listener = (name: string, action: string, value?: ProjectDefinition) => {
      expect(name).toBe('my-app');
      expect(action).toBe('add');
      expect(value).not.toBeUndefined();
      if (value) {
        expect(value.root).toBe('src/my-app');
      }
    };

    const collection = new ProjectDefinitionCollection(undefined, listener);

    collection.add({
      name: 'my-app',
      root: 'src/my-app',
    });
  });

  it('listens to a removal', () => {
    const initial = {
      'my-app': { root: 'src/my-app', extensions: {}, targets: new TargetDefinitionCollection() },
    };

    const listener = (name: string, action: string) => {
      expect(name).toBe('my-app');
      expect(action).toBe('remove');
    };

    const collection = new ProjectDefinitionCollection(initial, listener);

    collection.delete('my-app');
  });

  it('listens to a replacement', () => {
    const initial = {
      'my-app': { root: 'src/my-app', extensions: {}, targets: new TargetDefinitionCollection() },
    };

    const listener = (
      name: string,
      action: string,
      newValue?: ProjectDefinition,
      oldValue?: ProjectDefinition,
    ) => {
      expect(name).toBe('my-app');
      expect(action).toBe('replace');
      expect(newValue).not.toBeUndefined();
      if (newValue) {
        expect(newValue.root).toBe('src/my-app2');
      }
      expect(oldValue).not.toBeUndefined();
      if (oldValue) {
        expect(oldValue.root).toBe('src/my-app');
      }
    };

    const collection = new ProjectDefinitionCollection(initial, listener);

    collection.set(
      'my-app',
      { root: 'src/my-app2', extensions: {}, targets: new TargetDefinitionCollection() },
    );
  });

});

describe('TargetDefinitionCollection', () => {

  it('can be created without initial values or a listener', () => {
    const collection = new TargetDefinitionCollection();

    expect(collection.size).toBe(0);
  });

  it('can be created with initial values', () => {
    const initial = {
      'build': { builder: 'builder:build' },
      'test': { builder: 'builder:test' },
    };

    const collection = new TargetDefinitionCollection(initial);

    expect(collection.size).toBe(2);

    const build = collection.get('build');
    expect(build).not.toBeUndefined();
    if (build) {
      expect(build.builder).toBe('builder:build');
    }
    const test = collection.get('test');
    expect(test).not.toBeUndefined();
    if (test) {
      expect(test.builder).toBe('builder:test');
    }
  });

  it('can be created with a listener', () => {
    const listener = () => { fail('listener should not execute on initialization'); };

    const collection = new TargetDefinitionCollection(undefined, listener);

    expect(collection.size).toBe(0);
  });

  it('can be created with initial values and a listener', () => {
    const initial = {
      'build': { builder: 'builder:build' },
      'test': { builder: 'builder:test' },
    };

    const listener = () => { fail('listener should not execute on initialization'); };

    const collection = new TargetDefinitionCollection(initial, listener);

    expect(collection.size).toBe(2);

    const build = collection.get('build');
    expect(build).not.toBeUndefined();
    if (build) {
      expect(build.builder).toBe('builder:build');
    }
    const test = collection.get('test');
    expect(test).not.toBeUndefined();
    if (test) {
      expect(test.builder).toBe('builder:test');
    }
  });

  it('listens to an addition via set', () => {
    const listener = (name: string, action: string) => {
      expect(name).toBe('build');
      expect(action).toBe('add');
    };

    const collection = new TargetDefinitionCollection(undefined, listener);

    collection.set(
      'build',
      { builder: 'builder:build' },
    );
  });

  it('listens to an addition via add', () => {
    const listener = (name: string, action: string, value?: TargetDefinition) => {
      expect(name).toBe('build');
      expect(action).toBe('add');
      expect(value).not.toBeUndefined();
      if (value) {
        expect(value.builder).toBe('builder:build');
      }
    };

    const collection = new TargetDefinitionCollection(undefined, listener);

    collection.add({
      name: 'build',
      builder: 'builder:build',
    });
  });

  it('listens to a removal', () => {
    const initial = {
      'build': { builder: 'builder:build' },
    };

    const listener = (name: string, action: string) => {
      expect(name).toBe('build');
      expect(action).toBe('remove');
    };

    const collection = new TargetDefinitionCollection(initial, listener);

    collection.delete('build');
  });

  it('listens to a replacement', () => {
    const initial = {
      'build': { builder: 'builder:build' },
    };

    const listener = (
      name: string,
      action: string,
      newValue?: TargetDefinition,
      oldValue?: TargetDefinition,
    ) => {
      expect(name).toBe('build');
      expect(action).toBe('replace');
      expect(newValue).not.toBeUndefined();
      if (newValue) {
        expect(newValue.builder).toBe('builder:test');
      }
      expect(oldValue).not.toBeUndefined();
      if (oldValue) {
        expect(oldValue.builder).toBe('builder:build');
      }
    };

    const collection = new TargetDefinitionCollection(initial, listener);

    collection.set(
      'build',
      { builder: 'builder:test' },
    );
  });

});
