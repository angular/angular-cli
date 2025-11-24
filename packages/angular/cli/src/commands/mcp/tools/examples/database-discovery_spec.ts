/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { Stats } from 'node:fs';
import { Host } from '../../host';
import { getVersionSpecificExampleDatabases } from './database-discovery';

describe('getVersionSpecificExampleDatabases', () => {
  let mockHost: jasmine.SpyObj<Host>;
  let mockLogger: { warn: jasmine.Spy };

  beforeEach(() => {
    mockHost = jasmine.createSpyObj('Host', ['resolveModule', 'readFile', 'stat']);
    mockLogger = {
      warn: jasmine.createSpy('warn'),
    };
  });

  it('should find a valid example database from a package', async () => {
    mockHost.resolveModule.and.callFake((specifier) => {
      if (specifier === '@angular/core/package.json') {
        return '/path/to/node_modules/@angular/core/package.json';
      }
      throw new Error(`Unexpected module specifier: ${specifier}`);
    });
    mockHost.readFile.and.resolveTo(
      JSON.stringify({
        name: '@angular/core',
        version: '18.1.0',
        angular: {
          examples: {
            format: 'sqlite',
            path: './resources/code-examples.db',
          },
        },
      }),
    );
    mockHost.stat.and.resolveTo({ size: 1024 } as Stats);

    const databases = await getVersionSpecificExampleDatabases(
      '/path/to/workspace',
      mockLogger,
      mockHost,
    );

    expect(databases.length).toBe(1);
    expect(databases[0].dbPath).toBe(
      '/path/to/node_modules/@angular/core/resources/code-examples.db',
    );
    expect(databases[0].source).toBe('package @angular/core@18.1.0');
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it('should skip packages without angular.examples metadata', async () => {
    mockHost.resolveModule.and.returnValue('/path/to/node_modules/@angular/core/package.json');
    mockHost.readFile.and.resolveTo(JSON.stringify({ name: '@angular/core', version: '18.1.0' }));

    const databases = await getVersionSpecificExampleDatabases(
      '/path/to/workspace',
      mockLogger,
      mockHost,
    );

    expect(databases.length).toBe(0);
  });

  it('should handle packages that are not found', async () => {
    mockHost.resolveModule.and.throwError(new Error('Cannot find module'));

    const databases = await getVersionSpecificExampleDatabases(
      '/path/to/workspace',
      mockLogger,
      mockHost,
    );

    expect(databases.length).toBe(0);
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it('should reject database paths that attempt path traversal', async () => {
    mockHost.resolveModule.and.returnValue('/path/to/node_modules/@angular/core/package.json');
    mockHost.readFile.and.resolveTo(
      JSON.stringify({
        name: '@angular/core',
        version: '18.1.0',
        angular: {
          examples: {
            format: 'sqlite',
            path: '../outside-package/danger.db',
          },
        },
      }),
    );

    const databases = await getVersionSpecificExampleDatabases(
      '/path/to/workspace',
      mockLogger,
      mockHost,
    );

    expect(databases.length).toBe(0);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      jasmine.stringMatching(/Detected a potential path traversal attempt/),
    );
  });

  it('should skip database files larger than 10MB', async () => {
    mockHost.resolveModule.and.returnValue('/path/to/node_modules/@angular/core/package.json');
    mockHost.readFile.and.resolveTo(
      JSON.stringify({
        name: '@angular/core',
        version: '18.1.0',
        angular: {
          examples: {
            format: 'sqlite',
            path: './resources/code-examples.db',
          },
        },
      }),
    );
    mockHost.stat.and.resolveTo({ size: 11 * 1024 * 1024 } as Stats); // 11MB

    const databases = await getVersionSpecificExampleDatabases(
      '/path/to/workspace',
      mockLogger,
      mockHost,
    );

    expect(databases.length).toBe(0);
    expect(mockLogger.warn).toHaveBeenCalledWith(jasmine.stringMatching(/is larger than 10MB/));
  });
});
