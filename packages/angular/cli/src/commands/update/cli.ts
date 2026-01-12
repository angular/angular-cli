/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { NodeWorkflow } from '@angular-devkit/schematics/tools';
import { Listr } from 'listr2';
import { existsSync, promises as fs } from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import npa from 'npm-package-arg';
import { Argv } from 'yargs';
import {
  CommandModule,
  CommandModuleError,
  CommandScope,
  Options,
} from '../../command-builder/command-module';
import { SchematicEngineHost } from '../../command-builder/utilities/schematic-engine-host';
import {
  InstalledPackage,
  PackageManager,
  PackageManifest,
  createPackageManager,
} from '../../package-managers';
import { colors } from '../../utilities/color';
import { disableVersionCheck } from '../../utilities/environment-options';
import { assertIsError } from '../../utilities/error';
import {
  checkCLIVersion,
  coerceVersionNumber,
  runTempBinary,
  shouldForcePackageManager,
} from './utilities/cli-version';
import { ANGULAR_PACKAGES_REGEXP } from './utilities/constants';
import { checkCleanGit } from './utilities/git';
import {
  commitChanges,
  executeMigration,
  executeMigrations,
  executeSchematic,
} from './utilities/migration';

interface UpdateCommandArgs {
  packages?: string[];
  force: boolean;
  next: boolean;
  'migrate-only'?: boolean;
  name?: string;
  from?: string;
  to?: string;
  'allow-dirty': boolean;
  verbose: boolean;
  'create-commits': boolean;
}

class CommandError extends Error {}

const UPDATE_SCHEMATIC_COLLECTION = path.join(__dirname, 'schematic/collection.json');

export default class UpdateCommandModule extends CommandModule<UpdateCommandArgs> {
  override scope = CommandScope.In;
  protected override shouldReportAnalytics = false;
  private readonly resolvePaths = [__dirname, this.context.root];

  command = 'update [packages..]';
  describe = 'Updates your workspace and its dependencies. See https://update.angular.dev/.';
  longDescriptionPath = path.join(__dirname, 'long-description.md');

  builder(localYargs: Argv): Argv<UpdateCommandArgs> {
    return localYargs
      .positional('packages', {
        description: 'The names of package(s) to update.',
        type: 'string',
        array: true,
      })
      .option('force', {
        description: 'Ignore peer dependency version mismatches.',
        type: 'boolean',
        default: false,
      })
      .option('next', {
        description: 'Use the prerelease version, including beta and RCs.',
        type: 'boolean',
        default: false,
      })
      .option('migrate-only', {
        description: 'Only perform a migration, do not update the installed version.',
        type: 'boolean',
      })
      .option('name', {
        description:
          'The name of the migration to run. Only available when a single package is updated.',
        type: 'string',
        conflicts: ['to', 'from'],
      })
      .option('from', {
        description:
          'Version from which to migrate from. ' +
          `Only available when a single package is updated, and only with 'migrate-only'.`,
        type: 'string',
        implies: ['migrate-only'],
        conflicts: ['name'],
      })
      .option('to', {
        describe:
          'Version up to which to apply migrations. Only available when a single package is updated, ' +
          `and only with 'migrate-only' option. Requires 'from' to be specified. Default to the installed version detected.`,
        type: 'string',
        implies: ['from', 'migrate-only'],
        conflicts: ['name'],
      })
      .option('allow-dirty', {
        describe:
          'Whether to allow updating when the repository contains modified or untracked files.',
        type: 'boolean',
        default: false,
      })
      .option('verbose', {
        describe: 'Display additional details about internal operations during execution.',
        type: 'boolean',
        default: false,
      })
      .option('create-commits', {
        describe: 'Create source control commits for updates and migrations.',
        type: 'boolean',
        alias: ['C'],
        default: false,
      })
      .middleware((argv) => {
        if (argv.name) {
          argv['migrate-only'] = true;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return argv as any;
      })
      .check(({ packages, 'allow-dirty': allowDirty, 'migrate-only': migrateOnly }) => {
        const { logger } = this.context;

        // This allows the user to easily reset any changes from the update.
        if (packages?.length && !checkCleanGit(this.context.root)) {
          if (allowDirty) {
            logger.warn(
              'Repository is not clean. Update changes will be mixed with pre-existing changes.',
            );
          } else {
            throw new CommandModuleError(
              'Repository is not clean. Please commit or stash any changes before updating.',
            );
          }
        }

        if (migrateOnly) {
          if (packages?.length !== 1) {
            throw new CommandModuleError(
              `A single package must be specified when using the 'migrate-only' option.`,
            );
          }
        }

        return true;
      })
      .strict();
  }

  async run(options: Options<UpdateCommandArgs>): Promise<number | void> {
    const { logger } = this.context;
    // Instantiate the package manager
    const packageManager = await createPackageManager({
      cwd: this.context.root,
      logger,
      configuredPackageManager: this.context.packageManager.name,
    });

    // Check if the current installed CLI version is older than the latest compatible version.
    // Skip when running `ng update` without a package name as this will not trigger an actual update.
    if (!disableVersionCheck && options.packages?.length) {
      const cliVersionToInstall = await checkCLIVersion(
        options.packages,
        logger,
        packageManager,
        options.next,
      );

      if (cliVersionToInstall) {
        logger.warn(
          'The installed Angular CLI version is outdated.\n' +
            `Installing a temporary Angular CLI versioned ${cliVersionToInstall} to perform the update.`,
        );

        return runTempBinary(
          `@angular/cli@${cliVersionToInstall}`,
          packageManager,
          process.argv.slice(2),
        );
      }
    }

    const packages: npa.Result[] = [];
    for (const request of options.packages ?? []) {
      try {
        const packageIdentifier = npa(request);

        // only registry identifiers are supported
        if (!packageIdentifier.registry) {
          logger.error(`Package '${request}' is not a registry package identifer.`);

          return 1;
        }

        if (packages.some((v) => v.name === packageIdentifier.name)) {
          logger.error(`Duplicate package '${packageIdentifier.name}' specified.`);

          return 1;
        }

        if (options.migrateOnly && packageIdentifier.rawSpec !== '*') {
          logger.warn('Package specifier has no effect when using "migrate-only" option.');
        }

        // Wildcard uses the next tag if next option is used otherwise use latest tag.
        // Wildcard is present if no selector is provided on the command line.
        if (packageIdentifier.rawSpec === '*') {
          packageIdentifier.fetchSpec = options.next ? 'next' : 'latest';
          packageIdentifier.type = 'tag';
        }

        packages.push(packageIdentifier);
      } catch (e) {
        assertIsError(e);
        logger.error(e.message);

        return 1;
      }
    }

    logger.info(`Using package manager: ${colors.gray(packageManager.name)}`);
    logger.info('Collecting installed dependencies...');

    const rootDependencies = await packageManager.getProjectDependencies();
    logger.info(`Found ${rootDependencies.size} dependencies.`);

    const workflow = new NodeWorkflow(this.context.root, {
      packageManager: packageManager.name,
      packageManagerForce: await shouldForcePackageManager(packageManager, logger, options.verbose),
      // __dirname -> favor @schematics/update from this package
      // Otherwise, use packages from the active workspace (migrations)
      resolvePaths: this.resolvePaths,
      schemaValidation: true,
      engineHostCreator: (options) => new SchematicEngineHost(options.resolvePaths),
    });

    if (packages.length === 0) {
      // Show status
      const { success } = await executeSchematic(
        workflow,
        logger,
        UPDATE_SCHEMATIC_COLLECTION,
        'update',
        {
          force: options.force,
          next: options.next,
          verbose: options.verbose,
          packageManager: packageManager.name,
          packages: [],
        },
      );

      return success ? 0 : 1;
    }

    return options.migrateOnly
      ? this.migrateOnly(
          workflow,
          (options.packages ?? [])[0],
          rootDependencies,
          options,
          packageManager,
        )
      : this.updatePackagesAndMigrate(
          workflow,
          rootDependencies,
          options,
          packages,
          packageManager,
        );
  }

  private async migrateOnly(
    workflow: NodeWorkflow,
    packageName: string,
    rootDependencies: Map<string, InstalledPackage>,
    options: Options<UpdateCommandArgs>,
    packageManager: PackageManager,
  ): Promise<number | void> {
    const { logger } = this.context;
    let packageDependency = rootDependencies.get(packageName);
    let packagePath = packageDependency?.path;
    let packageNode: PackageManifest | undefined;

    if (!packageDependency) {
      const installed = await packageManager.getInstalledPackage(packageName);
      if (installed) {
        packageDependency = installed;
        packagePath = installed.path;
      }
    }

    if (packagePath) {
      packageNode = await readPackageManifest(path.join(packagePath, 'package.json'));
    }

    if (!packageNode) {
      const jsonPath = findPackageJson(this.context.root, packageName);
      if (jsonPath) {
        packageNode = await readPackageManifest(jsonPath);

        if (!packagePath) {
          packagePath = path.dirname(jsonPath);
        }
      }
    }

    if (!packageNode || !packagePath) {
      logger.error('Package is not installed.');

      return 1;
    }

    const updateMetadata = packageNode['ng-update'];
    let migrations = updateMetadata?.migrations;
    if (migrations === undefined) {
      logger.error('Package does not provide migrations.');

      return 1;
    } else if (typeof migrations !== 'string') {
      logger.error('Package contains a malformed migrations field.');

      return 1;
    } else if (path.posix.isAbsolute(migrations) || path.win32.isAbsolute(migrations)) {
      logger.error(
        'Package contains an invalid migrations field. Absolute paths are not permitted.',
      );

      return 1;
    }

    // Normalize slashes
    migrations = migrations.replace(/\\/g, '/');

    if (migrations.startsWith('../')) {
      logger.error(
        'Package contains an invalid migrations field. Paths outside the package root are not permitted.',
      );

      return 1;
    }

    // Check if it is a package-local location
    const localMigrations = path.join(packagePath, migrations);
    if (existsSync(localMigrations)) {
      migrations = localMigrations;
    } else {
      // Try to resolve from package location.
      // This avoids issues with package hoisting.
      try {
        const packageRequire = createRequire(packagePath + '/');
        migrations = packageRequire.resolve(migrations, { paths: this.resolvePaths });
      } catch (e) {
        assertIsError(e);
        if (e.code === 'MODULE_NOT_FOUND') {
          logger.error('Migrations for package were not found.');
        } else {
          logger.error(`Unable to resolve migrations for package.  [${e.message}]`);
        }

        return 1;
      }
    }

    if (options.name) {
      return executeMigration(
        workflow,
        logger,
        packageName,
        migrations,
        options.name,
        options.createCommits,
      );
    }

    const from = coerceVersionNumber(options.from);
    if (!from) {
      logger.error(`"from" value [${options.from}] is not a valid version.`);

      return 1;
    }

    return executeMigrations(
      workflow,
      logger,
      packageName,
      migrations,
      from,
      options.to || packageNode.version,
      options.createCommits,
    );
  }

  // eslint-disable-next-line max-lines-per-function
  private async updatePackagesAndMigrate(
    workflow: NodeWorkflow,
    rootDependencies: Map<string, InstalledPackage>,
    options: Options<UpdateCommandArgs>,
    packages: npa.Result[],
    packageManager: PackageManager,
  ): Promise<number> {
    const { logger } = this.context;

    const logVerbose = (message: string) => {
      if (options.verbose) {
        logger.info(message);
      }
    };

    const requests: {
      identifier: npa.Result;
      node: InstalledPackage;
    }[] = [];

    // Validate packages actually are part of the workspace
    for (const pkg of packages) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const node = rootDependencies.get(pkg.name!);
      if (!node) {
        logger.error(`Package '${pkg.name}' is not a dependency.`);

        return 1;
      }

      // If a specific version is requested and matches the installed version, skip.
      if (pkg.type === 'version' && node.version === pkg.fetchSpec) {
        logger.info(`Package '${pkg.name}' is already at '${pkg.fetchSpec}'.`);
        continue;
      }

      requests.push({ identifier: pkg, node });
    }

    if (requests.length === 0) {
      return 0;
    }

    logger.info('Fetching dependency metadata from registry...');

    const packagesToUpdate: string[] = [];
    for (const { identifier: requestIdentifier, node } of requests) {
      const packageName = requestIdentifier.name;

      let manifest: PackageManifest | null = null;
      try {
        manifest = await packageManager.getManifest(requestIdentifier);
      } catch (e) {
        assertIsError(e);
        logger.error(`Error fetching manifest for '${packageName}': ` + e.message);

        return 1;
      }

      if (!manifest) {
        logger.error(
          `Package specified by '${requestIdentifier.raw}' does not exist within the registry.`,
        );

        return 1;
      }

      if (manifest.version === node.version) {
        logger.info(`Package '${packageName}' is already up to date.`);
        continue;
      }

      if (ANGULAR_PACKAGES_REGEXP.test(node.name)) {
        const { name, version } = node;
        const toBeInstalledMajorVersion = +manifest.version.split('.')[0];
        const currentMajorVersion = +version.split('.')[0];

        if (toBeInstalledMajorVersion - currentMajorVersion > 1) {
          // Only allow updating a single version at a time.
          if (currentMajorVersion < 6) {
            // Before version 6, the major versions were not always sequential.
            // Example @angular/core skipped version 3, @angular/cli skipped versions 2-5.
            logger.error(
              `Updating multiple major versions of '${name}' at once is not supported. Please migrate each major version individually.\n` +
                `For more information about the update process, see https://update.angular.dev/.`,
            );
          } else {
            const nextMajorVersionFromCurrent = currentMajorVersion + 1;

            logger.error(
              `Updating multiple major versions of '${name}' at once is not supported. Please migrate each major version individually.\n` +
                `Run 'ng update ${name}@${nextMajorVersionFromCurrent}' in your workspace directory ` +
                `to update to latest '${nextMajorVersionFromCurrent}.x' version of '${name}'.\n\n` +
                `For more information about the update process, see https://update.angular.dev/?v=${currentMajorVersion}.0-${nextMajorVersionFromCurrent}.0`,
            );
          }

          return 1;
        }
      }

      packagesToUpdate.push(requestIdentifier.toString());
    }

    if (packagesToUpdate.length === 0) {
      return 0;
    }

    const { success } = await executeSchematic(
      workflow,
      logger,
      UPDATE_SCHEMATIC_COLLECTION,
      'update',
      {
        verbose: options.verbose,
        force: options.force,
        next: options.next,
        packageManager: this.context.packageManager.name,
        packages: packagesToUpdate,
      },
    );

    if (success) {
      const { root: commandRoot } = this.context;
      const ignorePeerDependencies = await shouldForcePackageManager(
        packageManager,
        logger,
        options.verbose,
      );
      const tasks = new Listr([
        {
          title: 'Cleaning node modules directory',
          async task(_, task) {
            try {
              await fs.rm(path.join(commandRoot, 'node_modules'), {
                force: true,
                recursive: true,
                maxRetries: 3,
              });
            } catch (e) {
              assertIsError(e);
              if (e.code === 'ENOENT') {
                task.skip('Cleaning not required. Node modules directory not found.');
              }
            }
          },
        },
        {
          title: 'Installing packages',
          async task() {
            try {
              await packageManager.install({
                ignorePeerDependencies,
              });
            } catch (e) {
              throw new CommandError('Unable to install packages');
            }
          },
        },
      ]);
      try {
        await tasks.run();
      } catch (e) {
        if (e instanceof CommandError) {
          return 1;
        }

        throw e;
      }
    }

    if (success && options.createCommits) {
      if (
        !commitChanges(logger, `Angular CLI update for packages - ${packagesToUpdate.join(', ')}`)
      ) {
        return 1;
      }
    }

    // This is a temporary workaround to allow data to be passed back from the update schematic
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const migrations = (global as any).externalMigrations as {
      package: string;
      collection: string;
      from: string;
      to: string;
    }[];

    if (success && migrations) {
      const rootRequire = createRequire(this.context.root + '/');
      for (const migration of migrations) {
        // Resolve the package from the workspace root, as otherwise it will be resolved from the temp
        // installed CLI version.
        let packagePath;
        logVerbose(
          `Resolving migration package '${migration.package}' from '${this.context.root}'...`,
        );
        try {
          try {
            packagePath = path.dirname(
              // This may fail if the `package.json` is not exported as an entry point
              rootRequire.resolve(path.join(migration.package, 'package.json')),
            );
          } catch (e) {
            assertIsError(e);
            if (e.code === 'MODULE_NOT_FOUND') {
              // Fallback to trying to resolve the package's main entry point
              packagePath = rootRequire.resolve(migration.package);
            } else {
              throw e;
            }
          }
        } catch (e) {
          assertIsError(e);
          if (e.code === 'MODULE_NOT_FOUND') {
            logVerbose(e.toString());
            logger.error(
              `Migrations for package (${migration.package}) were not found.` +
                ' The package could not be found in the workspace.',
            );
          } else {
            logger.error(
              `Unable to resolve migrations for package (${migration.package}).  [${e.message}]`,
            );
          }

          return 1;
        }

        let migrations;

        // Check if it is a package-local location
        const localMigrations = path.join(packagePath, migration.collection);
        if (existsSync(localMigrations)) {
          migrations = localMigrations;
        } else {
          // Try to resolve from package location.
          // This avoids issues with package hoisting.
          try {
            const packageRequire = createRequire(packagePath + '/');
            migrations = packageRequire.resolve(migration.collection);
          } catch (e) {
            assertIsError(e);
            if (e.code === 'MODULE_NOT_FOUND') {
              logger.error(`Migrations for package (${migration.package}) were not found.`);
            } else {
              logger.error(
                `Unable to resolve migrations for package (${migration.package}).  [${e.message}]`,
              );
            }

            return 1;
          }
        }
        const result = await executeMigrations(
          workflow,
          logger,
          migration.package,
          migrations,
          migration.from,
          migration.to,
          options.createCommits,
        );

        // A non-zero value is a failure for the package's migrations
        if (result !== 0) {
          return result;
        }
      }
    }

    return success ? 0 : 1;
  }
}

async function readPackageManifest(manifestPath: string): Promise<PackageManifest | undefined> {
  try {
    const content = await fs.readFile(manifestPath, 'utf8');

    return JSON.parse(content) as PackageManifest;
  } catch {
    return undefined;
  }
}

function findPackageJson(workspaceDir: string, packageName: string): string | undefined {
  try {
    const projectRequire = createRequire(path.join(workspaceDir, 'package.json'));
    const packageJsonPath = projectRequire.resolve(`${packageName}/package.json`);

    return packageJsonPath;
  } catch {
    return undefined;
  }
}
