/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { logging } from '@angular-devkit/core';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import * as semver from 'semver';
import {
  angularMajorCompatGuarantee,
  applyUpdatePlan,
  resolveUserUpdatePlan,
} from './update-resolver';

describe('angularMajorCompatGuarantee', () => {
  [
    '5.0.0',
    '5.1.0',
    '5.20.0',
    '6.0.0',
    '6.0.0-rc.0',
    '6.0.0-beta.0',
    '6.1.0-beta.0',
    '6.1.0-rc.0',
    '6.10.11',
  ].forEach((golden) => {
    it('works with ' + JSON.stringify(golden), () => {
      expect(semver.satisfies(golden, angularMajorCompatGuarantee('^5.0.0'))).toBeTruthy();
    });
  });
});

describe('UpdateResolver', () => {
  let tempRoot: string;
  const logger = new logging.NullLogger();

  beforeEach(() => {
    tempRoot = mkdtempSync(path.join(tmpdir(), 'angular-cli-update-resolver-test-'));
  });

  afterEach(() => {
    rmSync(tempRoot, { recursive: true, force: true });
  });

  function createMockWorkspace(
    packageJson: Record<string, unknown>,
    nodeModules: { [name: string]: { version: string; manifest?: Record<string, unknown> } } = {},
  ) {
    writeFileSync(path.join(tempRoot, 'package.json'), JSON.stringify(packageJson, null, 2));
    for (const [name, info] of Object.entries(nodeModules)) {
      const pkgDir = path.join(tempRoot, 'node_modules', name);
      mkdirSync(pkgDir, { recursive: true });
      writeFileSync(
        path.join(pkgDir, 'package.json'),
        JSON.stringify({ name, version: info.version, ...info.manifest }, null, 2),
      );
    }
  }

  it('ignores dependencies not hosted on the NPM registry', async () => {
    createMockWorkspace({
      name: 'blah',
      dependencies: {
        '@angular-devkit-tests/update-base': 'file:update-base-1.0.0.tgz',
      },
    });

    const plan = await resolveUserUpdatePlan(
      {
        packages: [],
        workspaceRoot: tempRoot,
      },
      logger,
    );

    expect(plan.packagesToUpdate.size).toBe(0);
  });

  it('should not error with yarn 2.0 protocols', async () => {
    createMockWorkspace(
      {
        name: 'blah',
        dependencies: {
          src: 'src@link:./src',
          '@angular-devkit-tests/update-base': '1.0.0',
        },
      },
      {
        '@angular-devkit-tests/update-base': { version: '1.0.0' },
      },
    );

    const plan = await resolveUserUpdatePlan(
      {
        packages: ['@angular-devkit-tests/update-base'],
        workspaceRoot: tempRoot,
      },
      logger,
    );

    expect(plan.packagesToUpdate.get('@angular-devkit-tests/update-base')).toBe('1.1.0');
  });

  it('updates Angular as compatible with Angular N-1', async () => {
    createMockWorkspace(
      {
        name: 'blah',
        dependencies: {
          '@angular-devkit-tests/update-peer-dependencies-angular-5': '1.0.0',
          '@angular/core': '5.1.0',
          rxjs: '5.5.0',
          'zone.js': '0.8.26',
        },
      },
      {
        '@angular-devkit-tests/update-peer-dependencies-angular-5': { version: '1.0.0' },
        '@angular/core': { version: '5.1.0' },
        rxjs: { version: '5.5.0' },
        'zone.js': { version: '0.8.26' },
      },
    );

    const plan = await resolveUserUpdatePlan(
      {
        packages: ['@angular/core@^6.0.0'],
        workspaceRoot: tempRoot,
      },
      logger,
    );

    expect(plan.packagesToUpdate.get('@angular/core')?.[0]).toBe('6');
  });

  it('uses packageGroup for versioning', async () => {
    createMockWorkspace(
      {
        name: 'blah',
        dependencies: {
          '@angular-devkit-tests/update-package-group-1': '1.0.0',
          '@angular-devkit-tests/update-package-group-2': '1.0.0',
        },
      },
      {
        '@angular-devkit-tests/update-package-group-1': { version: '1.0.0' },
        '@angular-devkit-tests/update-package-group-2': { version: '1.0.0' },
      },
    );

    const plan = await resolveUserUpdatePlan(
      {
        packages: ['@angular-devkit-tests/update-package-group-1'],
        workspaceRoot: tempRoot,
      },
      logger,
    );

    expect(plan.packagesToUpdate.get('@angular-devkit-tests/update-package-group-1')).toBe('1.2.0');
    expect(plan.packagesToUpdate.get('@angular-devkit-tests/update-package-group-2')).toBe('2.0.0');
  });

  it('does not remove newline at the end of package.json', async () => {
    const newline = '\n';
    const packageJsonContent = `{
  "name": "blah",
  "dependencies": {
    "@angular-devkit-tests/update-base": "1.0.0"
  }
}${newline}`;

    writeFileSync(path.join(tempRoot, 'package.json'), packageJsonContent);

    // Mock installed package
    const pkgDir = path.join(tempRoot, 'node_modules', '@angular-devkit-tests/update-base');
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(
      path.join(pkgDir, 'package.json'),
      JSON.stringify({ name: '@angular-devkit-tests/update-base', version: '1.0.0' }, null, 2),
    );

    const plan = await resolveUserUpdatePlan(
      {
        packages: ['@angular-devkit-tests/update-base'],
        workspaceRoot: tempRoot,
      },
      logger,
    );

    await applyUpdatePlan(tempRoot, plan, logger);

    const result = readFileSync(path.join(tempRoot, 'package.json'), 'utf8');
    expect(result.endsWith(newline)).toBeTrue();
  });

  it('does not add a newline at the end of package.json', async () => {
    const packageJsonContent = `{
  "name": "blah",
  "dependencies": {
    "@angular-devkit-tests/update-base": "1.0.0"
  }
}`;

    writeFileSync(path.join(tempRoot, 'package.json'), packageJsonContent);

    // Mock installed package
    const pkgDir = path.join(tempRoot, 'node_modules', '@angular-devkit-tests/update-base');
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(
      path.join(pkgDir, 'package.json'),
      JSON.stringify({ name: '@angular-devkit-tests/update-base', version: '1.0.0' }, null, 2),
    );

    const plan = await resolveUserUpdatePlan(
      {
        packages: ['@angular-devkit-tests/update-base'],
        workspaceRoot: tempRoot,
      },
      logger,
    );

    await applyUpdatePlan(tempRoot, plan, logger);

    const result = readFileSync(path.join(tempRoot, 'package.json'), 'utf8');
    expect(result.endsWith('}')).toBeTrue();
  });
});
