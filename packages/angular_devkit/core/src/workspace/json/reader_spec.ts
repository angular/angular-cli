/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-non-null-assertion no-big-function
import { readFileSync } from 'fs';
import { JsonObject } from '../../json';
import { stripIndent } from '../../utils/literals';
import { TargetDefinitionCollection, WorkspaceDefinition } from '../definitions';
import { JsonWorkspaceDefinition, JsonWorkspaceMetadata, JsonWorkspaceSymbol } from './metadata';
import { readJsonWorkspace } from './reader';

const basicFile = stripIndent`
{
  "version": 1,
  // Comment
  "schematics": {
    "@angular/schematics:component": {
      "prefix": "abc"
    }
  },
  "x-foo": {
    "is": ["good", "great", "awesome"]
  },
  "x-bar": 5,
}`;

const representativeFile = readFileSync(__dirname + '/test/angular.json', 'utf8');

function createTestHost(content: string, onWrite?: (path: string, data: string) => void) {
  return {
    async readFile() {
      return content;
    },
    async writeFile(path: string, data: string) {
      if (onWrite) {
        onWrite(path, data);
      }
    },
    async isFile() {
      return true;
    },
    async isDirectory() {
      return true;
    },
  };
}

function getMetadata(workspace: WorkspaceDefinition): JsonWorkspaceMetadata {
  const metadata = (workspace as JsonWorkspaceDefinition)[JsonWorkspaceSymbol];
  expect(metadata).toBeDefined('JSON metadata not found. Invalid workspace definition returned.');

  return metadata;
}

describe('readJsonWorkpace Parsing', () => {
  it('parses a basic file', async () => {
    const host = createTestHost(basicFile);

    const workspace = await readJsonWorkspace('basic', host);

    expect(workspace.projects.size).toBe(0);
    expect(workspace.extensions['x-bar']).toBe(5);
    expect(workspace.extensions['schematics']).toEqual({
      '@angular/schematics:component': { prefix: 'abc' },
    });
  });

  it('parses a representative file', async () => {
    const host = createTestHost(representativeFile);

    const workspace = await readJsonWorkspace('', host);

    expect(Array.from(workspace.projects.keys())).toEqual(['my-app', 'my-app-e2e']);
    expect(workspace.extensions['newProjectRoot']).toBe('projects');
    expect(workspace.extensions['defaultProject']).toBe('my-app');
    expect(workspace.projects.get('my-app')!.extensions['schematics']).toEqual({
      '@schematics/angular:component': { styleext: 'scss' },
    });
    expect(workspace.projects.get('my-app')!.root).toBe('');
    expect(workspace.projects.get('my-app')!.targets.get('build')!.builder).toBe(
      '@angular-devkit/build-angular:browser',
    );
  });

  it('parses extensions only into extensions object', async () => {
    const host = createTestHost(representativeFile);

    const workspace = await readJsonWorkspace('', host);

    expect(workspace.extensions['newProjectRoot']).toBe('projects');
    // tslint:disable-next-line:no-any
    expect((workspace as any)['newProjectRoot']).toBeUndefined();

    expect(workspace.projects.get('my-app')!.extensions['schematics']).toEqual({
      '@schematics/angular:component': { styleext: 'scss' },
    });
    // tslint:disable-next-line:no-any
    expect((workspace.projects.get('my-app') as any)['schematics']).toBeUndefined();
  });

  it('errors on invalid version', async () => {
    const host = createTestHost(stripIndent`
      {
        "version": 99,
        // Comment
        "x-bar": 5,
      }
    `);

    try {
      await readJsonWorkspace('', host);
      fail();
    } catch (e) {
      expect(e.message).toContain('Invalid format version detected');
    }
  });

  it('errors on missing version', async () => {
    const host = createTestHost(stripIndent`
      {
        // Comment
        "x-bar": 5,
      }
    `);

    try {
      await readJsonWorkspace('', host);
      fail();
    } catch (e) {
      expect(e.message).toContain('version specifier not found');
    }
  });
});

describe('JSON WorkspaceDefinition Tracks Workspace Changes', () => {
  it('tracks basic extension additions', async () => {
    const host = createTestHost(basicFile);

    const workspace = await readJsonWorkspace('', host);

    workspace.extensions['x-baz'] = 101;
    expect(workspace.extensions['x-baz']).toBe(101);

    const metadata = getMetadata(workspace);

    expect(metadata.hasChanges).toBeTruthy();
    expect(metadata.changeCount).toBe(1);

    const change = metadata.findChangesForPath('/x-baz')[0];
    expect(change).not.toBeUndefined();
    if (change) {
      expect(change.op).toBe('add');
      expect(change.value).toBe(101);
    }
  });

  it('tracks complex extension additions', async () => {
    const host = createTestHost(basicFile);

    const workspace = await readJsonWorkspace('', host);

    const value = { a: 1, b: 2, c: { d: 'abc' } };
    workspace.extensions['x-baz'] = value;
    expect(workspace.extensions['x-baz']).toEqual({ a: 1, b: 2, c: { d: 'abc' } });

    value.b = 3;
    expect(workspace.extensions['x-baz']).toEqual({ a: 1, b: 3, c: { d: 'abc' } });

    const metadata = getMetadata(workspace);

    expect(metadata.hasChanges).toBeTruthy();
    expect(metadata.changeCount).toBe(1);

    const change = metadata.findChangesForPath('/x-baz')[0];
    expect(change).not.toBeUndefined();
    if (change) {
      expect(change.op).toBe('add');
      expect(change.value).toEqual({ a: 1, b: 3, c: { d: 'abc' } });
    }
  });

  it('tracks complex extension additions with Object.assign target', async () => {
    const host = createTestHost(basicFile);

    const workspace = await readJsonWorkspace('', host);

    const value = { a: 1, b: 2, c: { d: 'abc' } };
    workspace.extensions['x-baz'] = value;
    expect(workspace.extensions['x-baz']).toEqual({ a: 1, b: 2, c: { d: 'abc' } });

    Object.assign(value, { x: 9, y: 8, z: 7 });
    expect(workspace.extensions['x-baz'])
      .toEqual({ a: 1, b: 2, c: { d: 'abc' }, x: 9, y: 8, z: 7 });

    const metadata = getMetadata(workspace);

    expect(metadata.hasChanges).toBeTruthy();
    expect(metadata.changeCount).toBe(1);

    const change = metadata.findChangesForPath('/x-baz')[0];
    expect(change).not.toBeUndefined();
    if (change) {
      expect(change.op).toBe('add');
      expect(change.value).toEqual({ a: 1, b: 2, c: { d: 'abc' }, x: 9, y: 8, z: 7 });
    }
  });

  it('tracks complex extension additions with Object.assign return', async () => {
    const host = createTestHost(basicFile);

    const workspace = await readJsonWorkspace('', host);

    const value = { a: 1, b: 2, c: { d: 'abc' } };
    workspace.extensions['x-baz'] = value;
    expect(workspace.extensions['x-baz']).toEqual({ a: 1, b: 2, c: { d: 'abc' } });

    workspace.extensions['x-baz'] = Object.assign(value, { x: 9, y: 8, z: 7 });
    expect(workspace.extensions['x-baz'])
      .toEqual({ a: 1, b: 2, c: { d: 'abc' }, x: 9, y: 8, z: 7 });

    const metadata = getMetadata(workspace);

    expect(metadata.hasChanges).toBeTruthy();
    expect(metadata.changeCount).toBe(1);

    const change = metadata.findChangesForPath('/x-baz')[0];
    expect(change).not.toBeUndefined();
    if (change) {
      expect(change.op).toBe('add');
      expect(change.value).toEqual({ a: 1, b: 2, c: { d: 'abc' }, x: 9, y: 8, z: 7 });
    }
  });

  it('tracks complex extension additions with spread operator', async () => {
    const host = createTestHost(basicFile);

    const workspace = await readJsonWorkspace('', host);

    const value = { a: 1, b: 2, c: { d: 'abc' } };
    workspace.extensions['x-baz'] = value;
    expect(workspace.extensions['x-baz']).toEqual({ a: 1, b: 2, c: { d: 'abc' } });

    workspace.extensions['x-baz'] = { ...value, ...{ x: 9, y: 8 }, z: 7 };
    expect(workspace.extensions['x-baz'])
      .toEqual({ a: 1, b: 2, c: { d: 'abc' }, x: 9, y: 8, z: 7 });

    const metadata = getMetadata(workspace);

    expect(metadata.hasChanges).toBeTruthy();
    expect(metadata.changeCount).toBe(1);

    const change = metadata.findChangesForPath('/x-baz')[0];
    expect(change).not.toBeUndefined();
    if (change) {
      expect(change.op).toBe('add');
      expect(change.value).toEqual({ a: 1, b: 2, c: { d: 'abc' }, x: 9, y: 8, z: 7 });
    }
  });

  it('tracks modifying an existing extension object with spread operator', async () => {
    const host = createTestHost(basicFile);

    const workspace = await readJsonWorkspace('', host);

    workspace.extensions['x-foo'] = {
      ...workspace.extensions['x-foo'] as JsonObject,
      ...{ x: 9, y: 8 }, z: 7 };
    expect(workspace.extensions['x-foo'])
      .toEqual({ is: ['good', 'great', 'awesome'], x: 9, y: 8, z: 7 });

    const metadata = getMetadata(workspace);

    expect(metadata.hasChanges).toBeTruthy();
    expect(metadata.changeCount).toBe(1);

    const change = metadata.findChangesForPath('/x-foo')[0];
    expect(change).not.toBeUndefined();
    if (change) {
      expect(change.op).toBe('replace');
      expect(change.value).toEqual({ is: ['good', 'great', 'awesome'], x: 9, y: 8, z: 7 });
    }
  });

  it('tracks modifying an existing extension object with Object.assign target', async () => {
    const host = createTestHost(basicFile);

    const workspace = await readJsonWorkspace('', host);

    Object.assign(
      workspace.extensions['x-foo'],
      { x: 9, y: 8 },
      { z: 7 },
    );
    expect(workspace.extensions['x-foo'])
      .toEqual({ is: ['good', 'great', 'awesome'], x: 9, y: 8, z: 7 });

    const metadata = getMetadata(workspace);

    expect(metadata.hasChanges).toBeTruthy();
    expect(metadata.changeCount).toBe(3);

    let change = metadata.findChangesForPath('/x-foo/x')[0];
    expect(change).not.toBeUndefined();
    if (change) {
      expect(change.op).toBe('add');
      expect(change.value).toEqual(9);
    }

    change = metadata.findChangesForPath('/x-foo/y')[0];
    expect(change).not.toBeUndefined();
    if (change) {
      expect(change.op).toBe('add');
      expect(change.value).toEqual(8);
    }

    change = metadata.findChangesForPath('/x-foo/z')[0];
    expect(change).not.toBeUndefined();
    if (change) {
      expect(change.op).toBe('add');
      expect(change.value).toEqual(7);
    }
  });

  it('tracks modifying an existing extension object with Object.assign return', async () => {
    const host = createTestHost(basicFile);

    const workspace = await readJsonWorkspace('', host);

    workspace.extensions['x-foo'] = Object.assign(
      workspace.extensions['x-foo'],
      { x: 9, y: 8 },
      { z: 7 },
    );
    expect(workspace.extensions['x-foo'])
      .toEqual({ is: ['good', 'great', 'awesome'], x: 9, y: 8, z: 7 });

    const metadata = getMetadata(workspace);

    expect(metadata.hasChanges).toBeTruthy();
    expect(metadata.changeCount).toBe(3);

    let change = metadata.findChangesForPath('/x-foo/x')[0];
    expect(change).not.toBeUndefined();
    if (change) {
      expect(change.op).toBe('add');
      expect(change.value).toEqual(9);
    }

    change = metadata.findChangesForPath('/x-foo/y')[0];
    expect(change).not.toBeUndefined();
    if (change) {
      expect(change.op).toBe('add');
      expect(change.value).toEqual(8);
    }

    change = metadata.findChangesForPath('/x-foo/z')[0];
    expect(change).not.toBeUndefined();
    if (change) {
      expect(change.op).toBe('add');
      expect(change.value).toEqual(7);
    }
  });

  it('tracks add and remove of an existing extension object', async () => {
    const host = createTestHost(basicFile);

    const workspace = await readJsonWorkspace('basic', host);

    workspace.extensions['schematics2'] = workspace.extensions['schematics'];

    expect(workspace.extensions['schematics']).toEqual({
      '@angular/schematics:component': { prefix: 'abc' },
    });
    expect(workspace.extensions['schematics2']).toEqual({
      '@angular/schematics:component': { prefix: 'abc' },
    });

    const metadata = getMetadata(workspace);

    expect(metadata.hasChanges).toBeTruthy();
    expect(metadata.changeCount).toBe(1);

    let change = metadata.findChangesForPath('/schematics2')[0];
    expect(change).not.toBeUndefined();
    if (change) {
      expect(change.op).toBe('add');
      expect(change.value).toEqual({ '@angular/schematics:component': { prefix: 'abc' } });
    }

    workspace.extensions['schematics'] = undefined;

    expect(metadata.hasChanges).toBeTruthy();
    expect(metadata.changeCount).toBe(2);

    change = metadata.findChangesForPath('/schematics')[0];
    expect(change).not.toBeUndefined();
    if (change) {
      expect(change.op).toBe('remove');
    }
  });

  it('tracks moving and modifying an existing extension object', async () => {
    const host = createTestHost(basicFile);

    const workspace = await readJsonWorkspace('basic', host);

    workspace.extensions['schematics2'] = workspace.extensions['schematics'];

    expect(workspace.extensions['schematics']).toEqual({
      '@angular/schematics:component': { prefix: 'abc' },
    });
    expect(workspace.extensions['schematics2']).toEqual({
      '@angular/schematics:component': { prefix: 'abc' },
    });

    const metadata = getMetadata(workspace);

    expect(metadata.hasChanges).toBeTruthy();
    expect(metadata.changeCount).toBe(1);

    let change = metadata.findChangesForPath('/schematics2')[0];
    expect(change).not.toBeUndefined();
    if (change) {
      expect(change.op).toBe('add');
      expect(change.value).toEqual({ '@angular/schematics:component': { prefix: 'abc' } });
    }

    workspace.extensions['schematics'] = undefined;
    (workspace.extensions['schematics2'] as JsonObject)['@angular/schematics:component'] = {
      prefix: 'xyz',
    };

    expect(metadata.hasChanges).toBeTruthy();
    expect(metadata.changeCount).toBe(2);

    change = metadata.findChangesForPath('/schematics')[0];
    expect(change).not.toBeUndefined();
    if (change) {
      expect(change.op).toBe('remove');
    }

    change = metadata.findChangesForPath('/schematics2')[0];
    expect(change).not.toBeUndefined();
    if (change) {
      expect(change.op).toBe('add');
      expect(change.value).toEqual({ '@angular/schematics:component': { prefix: 'xyz' } });
    }
  });

  it('tracks copying and modifying an existing extension object', async () => {
    const host = createTestHost(basicFile);

    const workspace = await readJsonWorkspace('basic', host);

    workspace.extensions['schematics2'] = workspace.extensions['schematics'];

    expect(workspace.extensions['schematics']).toEqual({
      '@angular/schematics:component': { prefix: 'abc' },
    });
    expect(workspace.extensions['schematics2']).toEqual({
      '@angular/schematics:component': { prefix: 'abc' },
    });

    const metadata = getMetadata(workspace);

    expect(metadata.hasChanges).toBeTruthy();
    expect(metadata.changeCount).toBe(1);

    let change = metadata.findChangesForPath('/schematics2')[0];
    expect(change).not.toBeUndefined();
    if (change) {
      expect(change.op).toBe('add');
      expect(change.value).toEqual({ '@angular/schematics:component': { prefix: 'abc' } });
    }

    (workspace.extensions['schematics2'] as JsonObject)['@angular/schematics:component'] = {
      prefix: 'xyz',
    };

    expect(metadata.hasChanges).toBeTruthy();
    expect(metadata.changeCount).toBe(2);

    change = metadata.findChangesForPath('/schematics/@angular~1schematics:component')[0];
    expect(change).not.toBeUndefined();
    if (change) {
      expect(change.op).toBe('replace');
      expect(change.value).toEqual({ prefix: 'xyz' });
    }

    change = metadata.findChangesForPath('/schematics2')[0];
    expect(change).not.toBeUndefined();
    if (change) {
      expect(change.op).toBe('add');
      expect(change.value).toEqual({ '@angular/schematics:component': { prefix: 'xyz' } });
    }
  });

  it('tracks copying, modifying, and removing an existing extension object', async () => {
    const host = createTestHost(basicFile);

    const workspace = await readJsonWorkspace('basic', host);

    workspace.extensions['schematics2'] = workspace.extensions['schematics'];

    expect(workspace.extensions['schematics']).toEqual({
      '@angular/schematics:component': { prefix: 'abc' },
    });
    expect(workspace.extensions['schematics2']).toEqual({
      '@angular/schematics:component': { prefix: 'abc' },
    });

    const metadata = getMetadata(workspace);

    expect(metadata.hasChanges).toBeTruthy();
    expect(metadata.changeCount).toBe(1);

    let change = metadata.findChangesForPath('/schematics2')[0];
    expect(change).not.toBeUndefined();
    if (change) {
      expect(change.op).toBe('add');
      expect(change.value).toEqual({ '@angular/schematics:component': { prefix: 'abc' } });
    }

    (workspace.extensions['schematics2'] as JsonObject)['@angular/schematics:component'] = {
      prefix: 'xyz',
    };

    expect(metadata.hasChanges).toBeTruthy();
    expect(metadata.changeCount).toBe(2);

    change = metadata.findChangesForPath('/schematics/@angular~1schematics:component')[0];
    expect(change).not.toBeUndefined();
    if (change) {
      expect(change.op).toBe('replace');
      expect(change.value).toEqual({ prefix: 'xyz' });
    }

    change = metadata.findChangesForPath('/schematics2')[0];
    expect(change).not.toBeUndefined();
    if (change) {
      expect(change.op).toBe('add');
      expect(change.value).toEqual({ '@angular/schematics:component': { prefix: 'xyz' } });
    }

    workspace.extensions['schematics'] = undefined;

    expect(metadata.hasChanges).toBeTruthy();
    expect(metadata.changeCount).toBe(2);

    change = metadata.findChangesForPath('/schematics')[0];
    expect(change).not.toBeUndefined();
    if (change) {
      expect(change.op).toBe('remove');
    }

    const orderedChanges = Array.from(metadata.changes.values());
    change = orderedChanges[1];
    expect(change).not.toBeUndefined();
    if (change) {
      expect(change.op).toBe('remove');
    }
  });

  it('tracks project additions with set', async () => {
    const host = createTestHost(representativeFile);

    const workspace = await readJsonWorkspace('', host);

    workspace.projects.set('new-app', {
      root: 'src',
      extensions: {},
      targets: new TargetDefinitionCollection(),
    });

    const app = workspace.projects.get('new-app');
    expect(app).not.toBeUndefined();
    if (app) {
      expect(app.extensions).toEqual({});
      expect(app.root).toBe('src');
    }

    const metadata = getMetadata(workspace);

    expect(metadata.hasChanges).toBeTruthy();
    expect(metadata.changeCount).toBe(1);

    const change = metadata.findChangesForPath('/projects/new-app')[0];
    expect(change).not.toBeUndefined();
    if (change) {
      expect(change.op).toBe('add');
      expect(change.value).toEqual(jasmine.objectContaining({ root: 'src' }));
    }
  });

  it('tracks project additions with add', async () => {
    const host = createTestHost(representativeFile);

    const workspace = await readJsonWorkspace('', host);

    workspace.projects.add({
      name: 'new-app',
      root: 'src',
    });

    const app = workspace.projects.get('new-app');
    expect(app).not.toBeUndefined();
    if (app) {
      expect(app.extensions).toEqual({});
      expect(app.root).toBe('src');
    }

    const metadata = getMetadata(workspace);

    expect(metadata.hasChanges).toBeTruthy();
    expect(metadata.changeCount).toBe(1);

    const change = metadata.findChangesForPath('/projects/new-app')[0];
    expect(change).not.toBeUndefined();
    if (change) {
      expect(change.op).toBe('add');
      expect(change.value).toEqual(jasmine.objectContaining({ root: 'src' }));
    }
  });
});

describe('JSON ProjectDefinition Tracks Project Changes', () => {
  it('tracks property changes', async () => {
    const host = createTestHost(representativeFile);

    const workspace = await readJsonWorkspace('', host);

    const project = workspace.projects.get('my-app');
    expect(project).not.toBeUndefined();
    if (!project) {
      return;
    }

    project.prefix = 'bar';
    expect(project.prefix).toBe('bar');

    const metadata = getMetadata(workspace);

    expect(metadata.hasChanges).toBeTruthy();
    expect(metadata.changeCount).toBe(1);

    const change = metadata.findChangesForPath('/projects/my-app/prefix')[0];
    expect(change).not.toBeUndefined();
    if (change) {
      expect(change.op).toBe('replace');
      expect(change.value).toBe('bar');
    }
  });

  it('tracks property additions', async () => {
    const host = createTestHost(representativeFile);

    const workspace = await readJsonWorkspace('', host);

    const project = workspace.projects.get('my-app');
    expect(project).not.toBeUndefined();
    if (!project) {
      return;
    }

    expect(project.sourceRoot).toBeUndefined();
    project.sourceRoot = 'xyz';
    expect(project.sourceRoot).toBe('xyz');

    const metadata = getMetadata(workspace);

    expect(metadata.hasChanges).toBeTruthy();
    expect(metadata.changeCount).toBe(1);

    const change = metadata.findChangesForPath('/projects/my-app/sourceRoot')[0];
    expect(change).not.toBeUndefined();
    if (change) {
      expect(change.op).toBe('add');
      expect(change.value).toBe('xyz');
    }
  });

  it('tracks extension additions', async () => {
    const host = createTestHost(representativeFile);

    const workspace = await readJsonWorkspace('', host);

    const project = workspace.projects.get('my-app');
    expect(project).not.toBeUndefined();
    if (!project) {
      return;
    }

    expect(project.extensions['abc-option']).toBeUndefined();
    project.extensions['abc-option'] = 'valueA';
    expect(project.extensions['abc-option']).toBe('valueA');

    const metadata = getMetadata(workspace);

    expect(metadata.hasChanges).toBeTruthy();
    expect(metadata.changeCount).toBe(1);

    const change = metadata.findChangesForPath('/projects/my-app/abc-option')[0];
    expect(change).not.toBeUndefined();
    if (change) {
      expect(change.op).toBe('add');
      expect(change.value).toBe('valueA');
    }
  });

  it('tracks target additions with no original target collection', async () => {
    const original = stripIndent`
      {
        "version": 1,
        // Comment
        "schematics": {
          "@angular/schematics:component": {
            "prefix": "abc"
          }
        },
        "projects": {
          "p1": {
            "root": "p1-root"
          }
        },
        "x-foo": {
          "is": ["good", "great", "awesome"]
        },
        "x-bar": 5,
      }
    `;
    const host = createTestHost(original);

    const workspace = await readJsonWorkspace('', host);

    const project = workspace.projects.get('p1');
    expect(project).not.toBeUndefined();
    if (!project) {
      return;
    }

    project.targets.add({
      name: 't1',
      builder: 't1-builder',
    });

    const metadata = getMetadata(workspace);

    expect(metadata.hasChanges).toBeTruthy();
    expect(metadata.changeCount).toBe(1);

    const change = metadata.findChangesForPath('/projects/p1/targets')[0];
    expect(change).not.toBeUndefined();
    if (change) {
      expect(change.op).toBe('add');
      expect(change.type).toBe('targetcollection');
    }
  });
});
