/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { logging } from '@angular-devkit/core';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Argv } from 'yargs';
import type { CommandContext } from '../../command-builder/definitions';
import type { PackageManager, PackageManifest } from '../../package-managers';
import AddCommandModule from './cli';

describe('AddCommandModule', () => {
  let root: string;
  let logger: logging.Logger;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'angular-cli-add-'));
    logger = {
      info: jasmine.createSpy('info'),
      error: jasmine.createSpy('error'),
      warn: jasmine.createSpy('warn'),
      debug: jasmine.createSpy('debug'),
      fatal: jasmine.createSpy('fatal'),
    } as unknown as logging.Logger;

    await writeFile(join(root, 'package.json'), '{}');
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('uses the installed package manifest to detect ng-add schematics', async () => {
    const packageName = '@private/package';
    const packageManager = createPackageManager({
      async add() {
        await writeInstalledPackageManifest(packageName, {
          name: packageName,
          version: '1.0.0',
          schematics: './collection.json',
        });
      },
      getManifest: jasmine
        .createSpy('getManifest')
        .and.resolveTo({ name: packageName, version: '1.0.0' }),
    });
    const command = createCommand(packageManager);
    const { createSchematic } = mockSchematicWorkflow(command);

    const result = await command.run({
      collection: `${packageName}@1.0.0`,
      defaults: false,
      dryRun: false,
      force: false,
      interactive: false,
      skipConfirmation: true,
    });

    expect(result).toBe(0);
    expect(packageManager.add).toHaveBeenCalled();
    expect(createSchematic).toHaveBeenCalledWith('ng-add', true);
    expect(command.executeSchematic).toHaveBeenCalledWith(
      jasmine.objectContaining({ collection: packageName }),
    );
  });

  it('uses the temporary package manifest to detect ng-add schematics', async () => {
    const packageName = '@private/package';
    const workingDirectory = join(root, 'temp-install');
    const packageManager = createPackageManager({
      async acquireTempPackage() {
        await writeInstalledPackageManifest(
          packageName,
          {
            name: packageName,
            version: '1.0.0',
            schematics: './collection.json',
          },
          workingDirectory,
        );

        return { workingDirectory, cleanup: jasmine.createSpy('cleanup') };
      },
      getManifest: jasmine.createSpy('getManifest').and.resolveTo({
        name: packageName,
        version: '1.0.0',
        'ng-add': { save: false },
      }),
    });
    const command = createCommand(packageManager);
    const { createSchematic } = mockSchematicWorkflow(command);

    const result = await command.run({
      collection: `${packageName}@1.0.0`,
      defaults: false,
      dryRun: false,
      force: false,
      interactive: false,
      skipConfirmation: true,
    });

    expect(result).toBe(0);
    expect(packageManager.add).not.toHaveBeenCalled();
    expect(packageManager.acquireTempPackage).toHaveBeenCalled();
    expect(createSchematic).toHaveBeenCalledWith('ng-add', true);
    expect(command.executeSchematic).toHaveBeenCalledWith(
      jasmine.objectContaining({
        collection: join(workingDirectory, 'node_modules', ...packageName.split('/')),
      }),
    );
  });

  function createCommand(packageManager: PackageManager): AddCommandModuleInternals {
    const context = {
      args: {
        positional: [],
        options: {
          getYargsCompletions: false,
          help: false,
          jsonHelp: false,
        },
      },
      currentDirectory: root,
      globalConfiguration: {},
      logger,
      packageManager,
      root,
      yargsInstance: {} as Argv,
    } as unknown as CommandContext;

    const command = new AddCommandModule(context) as unknown as AddCommandModuleInternals;
    command.executeSchematic = jasmine.createSpy('executeSchematic').and.resolveTo(0);

    return command;
  }

  function createPackageManager(options: {
    acquireTempPackage?: PackageManager['acquireTempPackage'];
    add?: PackageManager['add'];
    getManifest: jasmine.Spy;
  }): PackageManager {
    const packageManager = {
      acquireTempPackage: jasmine
        .createSpy('acquireTempPackage')
        .and.callFake(options.acquireTempPackage ?? fail),
      add: jasmine.createSpy('add').and.callFake(options.add ?? fail),
      getManifest: options.getManifest,
      name: 'npm',
    } as unknown as PackageManager;

    return packageManager;
  }

  function mockSchematicWorkflow(command: AddCommandModuleInternals): {
    createSchematic: jasmine.Spy;
  } {
    const createSchematic = jasmine.createSpy('createSchematic');

    command.getOrCreateWorkflowForBuilder = jasmine
      .createSpy('getOrCreateWorkflowForBuilder')
      .and.returnValue({
        engine: {
          createCollection: jasmine.createSpy('createCollection').and.returnValue({
            createSchematic,
          }),
        },
      });

    return { createSchematic };
  }

  async function writeInstalledPackageManifest(
    packageName: string,
    manifest: PackageManifest,
    basePath = root,
  ): Promise<void> {
    const packagePath = join(basePath, 'node_modules', ...packageName.split('/'));

    await mkdir(packagePath, { recursive: true });
    await writeFile(join(packagePath, 'package.json'), JSON.stringify(manifest));
  }
});

type AddCommandModuleInternals = {
  executeSchematic: jasmine.Spy;
  getOrCreateWorkflowForBuilder: jasmine.Spy;
  run: AddCommandModule['run'];
};
