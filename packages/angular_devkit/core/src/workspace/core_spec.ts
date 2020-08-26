/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-big-function
import { getSystemPath, join, normalize } from '../virtual-fs';
import {
  WorkspaceFormat,
  _test_addWorkspaceFile,
  _test_removeWorkspaceFile,
  readWorkspace,
  writeWorkspace,
} from './core';
import { WorkspaceDefinition } from './definitions';
import { WorkspaceHost } from './host';


describe('readWorkspace', () => {
  it('attempts to read from specified file path [angular.json]', async (done) => {
    const requestedPath = '/path/to/workspace/angular.json';

    const host: WorkspaceHost = {
      async readFile(path) {
        expect(path).toBe(requestedPath);

        return '{ "version": 1 }';
      },
      async writeFile() {},
      async isFile(path) {
        return path === requestedPath;
      },
      async isDirectory(path) {
        if (path !== requestedPath) {
          fail();
        }

        return false;
      },
    };

    await readWorkspace(requestedPath, host);

    done();
  });

  it('attempts to read from specified file path [.angular.json]', async (done) => {
    const requestedPath = '/path/to/workspace/.angular.json';

    const host: WorkspaceHost = {
      async readFile(path) {
        expect(path).toBe(requestedPath);

        return '{ "version": 1 }';
      },
      async writeFile() {},
      async isFile(path) {
        return path === requestedPath;
      },
      async isDirectory(path) {
        if (path !== requestedPath) {
          fail();
        }

        return false;
      },
    };

    await readWorkspace(requestedPath, host);

    done();
  });

  it('attempts to read from specified non-standard file path with format', async (done) => {
    const requestedPath = '/path/to/workspace/abc.json';

    const host: WorkspaceHost = {
      async readFile(path) {
        expect(path).toBe(requestedPath);

        return '{ "version": 1 }';
      },
      async writeFile() {},
      async isFile(path) {
        return path === requestedPath;
      },
      async isDirectory(path) {
        if (path !== requestedPath) {
          fail();
        }

        return false;
      },
    };

    await readWorkspace(requestedPath, host, WorkspaceFormat.JSON);

    done();
  });

  it('errors when reading from specified non-standard file path without format', async (done) => {
    const requestedPath = '/path/to/workspace/abc.json';

    const host: WorkspaceHost = {
      async readFile(path) {
        expect(path).toBe(requestedPath);

        return '{ "version": 1 }';
      },
      async writeFile() {},
      async isFile(path) {
        return path === requestedPath;
      },
      async isDirectory(path) {
        if (path !== requestedPath) {
          fail();
        }

        return false;
      },
    };

    try {
      await readWorkspace(requestedPath, host);
      fail();
    } catch (e) {
      expect(e.message).toContain('Unable to determine format for workspace path');
    }

    done();
  });

  it('errors when reading from specified file path with invalid specified format', async (done) => {
    const requestedPath = '/path/to/workspace/angular.json';

    const host: WorkspaceHost = {
      async readFile(path) {
        expect(path).toBe(requestedPath);

        return '{ "version": 1 }';
      },
      async writeFile() {},
      async isFile(path) {
        return path === requestedPath;
      },
      async isDirectory(path) {
        if (path !== requestedPath) {
          fail();
        }

        return false;
      },
    };

    try {
      await readWorkspace(requestedPath, host, 12 as WorkspaceFormat);
      fail();
    } catch (e) {
      expect(e.message).toContain('Unsupported workspace format');
    }

    done();
  });

  it('attempts to find/read from directory path', async (done) => {
    const requestedPath = getSystemPath(normalize('/path/to/workspace'));
    const expectedFile = getSystemPath(join(normalize(requestedPath), '.angular.json'));

    const isFileChecks: string[] = [];
    const host: WorkspaceHost = {
      async readFile(path) {
        expect(path).not.toBe(requestedPath);
        expect(path).toBe(expectedFile);

        return '{ "version": 1 }';
      },
      async writeFile() {},
      async isFile(path) {
        isFileChecks.push(path);

        return path === expectedFile;
      },
      async isDirectory(path) {
        if (path === requestedPath) {
          return true;
        }

        fail();

        return false;
      },
    };

    await readWorkspace(requestedPath, host);
    isFileChecks.sort();
    expect(isFileChecks).toEqual([
      getSystemPath(join(normalize(requestedPath), 'angular.json')),
      getSystemPath(join(normalize(requestedPath), '.angular.json')),
    ].sort());

    done();
  });

  it('attempts to find/read only files for specified format from directory path', async (done) => {
    const requestedPath = '/path/to/workspace';

    const isFileChecks: string[] = [];
    const readFileChecks: string[] = [];
    const host: WorkspaceHost = {
      async readFile(path) {
        expect(path).not.toBe(requestedPath);
        readFileChecks.push(path);

        return '{ "version": 1 }';
      },
      async writeFile() {},
      async isFile(path) {
        isFileChecks.push(path);

        return true;
      },
      async isDirectory(path) {
        if (path === requestedPath) {
          return true;
        }

        fail();

        return false;
      },
    };

    _test_addWorkspaceFile('wrong.format', 99);
    try {
      await readWorkspace(requestedPath, host, WorkspaceFormat.JSON);
    } finally {
      _test_removeWorkspaceFile('wrong.format');
    }

    isFileChecks.sort();
    expect(isFileChecks).toEqual([
      getSystemPath(join(normalize(requestedPath), 'angular.json')),
    ]);

    readFileChecks.sort();
    expect(readFileChecks).toEqual([
      getSystemPath(join(normalize(requestedPath), 'angular.json')),
    ]);

    done();
  });

  it('errors when no file found from specified directory path', async (done) => {
    const requestedPath = '/path/to/workspace';

    const host: WorkspaceHost = {
      async readFile(path) {
        expect(path).not.toBe(requestedPath);

        return '{ "version": 1 }';
      },
      async writeFile() {},
      async isFile() {
        return false;
      },
      async isDirectory(path) {
        if (path === requestedPath) {
          return true;
        }

        fail();

        return false;
      },
    };

    try {
      await readWorkspace(requestedPath, host);
      fail();
    } catch (e) {
      expect(e.message).toContain('Unable to locate a workspace file');
    }

    done();
  });

});

describe('writeWorkspace', () => {
  it('attempts to write to specified file path', async (done) => {
    const requestedPath = '/path/to/workspace/angular.json';

    let writtenPath: string | undefined;
    const host: WorkspaceHost = {
      async readFile() {
        fail();

        return '';
      },
      async writeFile(path) {
        expect(writtenPath).toBeUndefined();
        writtenPath = path;
      },
      async isFile() {
        fail();

        return false;
      },
      async isDirectory() {
        fail();

        return false;
      },
    };

    await writeWorkspace({} as WorkspaceDefinition, host, requestedPath, WorkspaceFormat.JSON);
    expect(writtenPath).toBe(requestedPath);

    done();
  });

  it('errors when writing to specified file path with invalid specified format', async (done) => {
    const requestedPath = '/path/to/workspace/angular.json';

    const host: WorkspaceHost = {
      async readFile() {
        fail();

        return '';
      },
      async writeFile() { fail(); },
      async isFile() {
        fail();

        return false;
      },
      async isDirectory() {
          fail();

          return false;
      },
    };

    try {
      await writeWorkspace({} as WorkspaceDefinition, host, requestedPath, 12 as WorkspaceFormat);
      fail();
    } catch (e) {
      expect(e.message).toContain('Unsupported workspace format');
    }

    done();
  });

  it('errors when writing custom workspace without specified format', async (done) => {
    const requestedPath = '/path/to/workspace/angular.json';

    const host: WorkspaceHost = {
      async readFile() {
        fail();

        return '';
      },
      async writeFile() { fail(); },
      async isFile() {
        fail();

        return false;
      },
      async isDirectory() {
          fail();

          return false;
      },
    };

    try {
      await writeWorkspace({} as WorkspaceDefinition, host, requestedPath);
      fail();
    } catch (e) {
      expect(e.message).toContain('A format is required');
    }

    done();
  });

});
