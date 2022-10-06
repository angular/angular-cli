/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { UnsuccessfulWorkflowExecution } from '@angular-devkit/schematics';
import { NodeWorkflow } from '@angular-devkit/schematics/tools';
import { SpawnSyncReturns, execSync, spawnSync } from 'child_process';
import { existsSync, promises as fs } from 'fs';
import { createRequire } from 'module';
import npa from 'npm-package-arg';
import pickManifest from 'npm-pick-manifest';
import * as path from 'path';
import { join, resolve } from 'path';
import * as semver from 'semver';
import { Argv } from 'yargs';
import { PackageManager } from '../../../lib/config/workspace-schema';
import {
  CommandModule,
  CommandModuleError,
  CommandScope,
  Options,
} from '../../command-builder/command-module';
import { SchematicEngineHost } from '../../command-builder/utilities/schematic-engine-host';
import { subscribeToWorkflow } from '../../command-builder/utilities/schematic-workflow';
import { colors } from '../../utilities/color';
import { disableVersionCheck } from '../../utilities/environment-options';
import { assertIsError } from '../../utilities/error';
import { writeErrorToLogFile } from '../../utilities/log-file';
import {
  PackageIdentifier,
  PackageManifest,
  fetchPackageManifest,
  fetchPackageMetadata,
} from '../../utilities/package-metadata';
import {
  PackageTreeNode,
  findPackageJson,
  getProjectDependencies,
  readPackageJson,
} from '../../utilities/package-tree';
import { VERSION } from '../../utilities/version';

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

const ANGULAR_PACKAGES_REGEXP = /^@(?:angular|nguniversal)\//;
const UPDATE_SCHEMATIC_COLLECTION = path.join(__dirname, 'schematic/collection.json');

export class UpdateCommandModule extends CommandModule<UpdateCommandArgs> {
  override scope = CommandScope.In;
  protected override shouldReportAnalytics = false;

  command = 'update [packages..]';
  describe = 'Updates your workspace and its dependencies. See https://update.angular.io/.';
  longDescriptionPath = join(__dirname, 'long-description.md');

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
          'The name of the migration to run. ' +
          `Only available with a single package being updated, and only with 'migrate-only' option.`,
        type: 'string',
        implies: ['migrate-only'],
        conflicts: ['to', 'from'],
      })
      .option('from', {
        description:
          'Version from which to migrate from. ' +
          `Only available with a single package being updated, and only with 'migrate-only'.`,
        type: 'string',
        implies: ['to', 'migrate-only'],
        conflicts: ['name'],
      })
      .option('to', {
        describe:
          'Version up to which to apply migrations. Only available with a single package being updated, ' +
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
      .check(({ packages, 'allow-dirty': allowDirty, 'migrate-only': migrateOnly }) => {
        const { logger } = this.context;

        // This allows the user to easily reset any changes from the update.
        if (packages?.length && !this.checkCleanGit()) {
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
    const { logger, packageManager } = this.context;

    packageManager.ensureCompatibility();

    // Check if the current installed CLI version is older than the latest compatible version.
    // Skip when running `ng update` without a package name as this will not trigger an actual update.
    if (!disableVersionCheck && options.packages?.length) {
      const cliVersionToInstall = await this.checkCLIVersion(
        options.packages,
        options.verbose,
        options.next,
      );

      if (cliVersionToInstall) {
        logger.warn(
          'The installed Angular CLI version is outdated.\n' +
            `Installing a temporary Angular CLI versioned ${cliVersionToInstall} to perform the update.`,
        );

        return this.runTempBinary(`@angular/cli@${cliVersionToInstall}`, process.argv.slice(2));
      }
    }

    const packages: PackageIdentifier[] = [];
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

        if (options.migrateOnly && packageIdentifier.rawSpec) {
          logger.warn('Package specifier has no effect when using "migrate-only" option.');
        }

        // If next option is used and no specifier supplied, use next tag
        if (options.next && !packageIdentifier.rawSpec) {
          packageIdentifier.fetchSpec = 'next';
        }

        packages.push(packageIdentifier as PackageIdentifier);
      } catch (e) {
        assertIsError(e);
        logger.error(e.message);

        return 1;
      }
    }

    logger.info(`Using package manager: ${colors.grey(packageManager.name)}`);
    logger.info('Collecting installed dependencies...');

    const rootDependencies = await getProjectDependencies(this.context.root);
    logger.info(`Found ${rootDependencies.size} dependencies.`);

    const workflow = new NodeWorkflow(this.context.root, {
      packageManager: packageManager.name,
      packageManagerForce: this.packageManagerForce(options.verbose),
      // __dirname -> favor @schematics/update from this package
      // Otherwise, use packages from the active workspace (migrations)
      resolvePaths: [__dirname, this.context.root],
      schemaValidation: true,
      engineHostCreator: (options) => new SchematicEngineHost(options.resolvePaths),
    });

    if (packages.length === 0) {
      // Show status
      const { success } = await this.executeSchematic(
        workflow,
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
      ? this.migrateOnly(workflow, (options.packages ?? [])[0], rootDependencies, options)
      : this.updatePackagesAndMigrate(workflow, rootDependencies, options, packages);
  }

  private async executeSchematic(
    workflow: NodeWorkflow,
    collection: string,
    schematic: string,
    options: Record<string, unknown> = {},
  ): Promise<{ success: boolean; files: Set<string> }> {
    const { logger } = this.context;
    const workflowSubscription = subscribeToWorkflow(workflow, logger);

    // TODO: Allow passing a schematic instance directly
    try {
      await workflow
        .execute({
          collection,
          schematic,
          options,
          logger,
        })
        .toPromise();

      return { success: !workflowSubscription.error, files: workflowSubscription.files };
    } catch (e) {
      if (e instanceof UnsuccessfulWorkflowExecution) {
        logger.error(`${colors.symbols.cross} Migration failed. See above for further details.\n`);
      } else {
        assertIsError(e);
        const logPath = writeErrorToLogFile(e);
        logger.fatal(
          `${colors.symbols.cross} Migration failed: ${e.message}\n` +
            `  See "${logPath}" for further details.\n`,
        );
      }

      return { success: false, files: workflowSubscription.files };
    } finally {
      workflowSubscription.unsubscribe();
    }
  }

  /**
   * @return Whether or not the migration was performed successfully.
   */
  private async executeMigration(
    workflow: NodeWorkflow,
    packageName: string,
    collectionPath: string,
    migrationName: string,
    commit?: boolean,
  ): Promise<number> {
    const { logger } = this.context;
    const collection = workflow.engine.createCollection(collectionPath);
    const name = collection.listSchematicNames().find((name) => name === migrationName);
    if (!name) {
      logger.error(`Cannot find migration '${migrationName}' in '${packageName}'.`);

      return 1;
    }

    logger.info(colors.cyan(`** Executing '${migrationName}' of package '${packageName}' **\n`));
    const schematic = workflow.engine.createSchematic(name, collection);

    return this.executePackageMigrations(workflow, [schematic.description], packageName, commit);
  }

  /**
   * @return Whether or not the migrations were performed successfully.
   */
  private async executeMigrations(
    workflow: NodeWorkflow,
    packageName: string,
    collectionPath: string,
    from: string,
    to: string,
    commit?: boolean,
  ): Promise<number> {
    const collection = workflow.engine.createCollection(collectionPath);
    const migrationRange = new semver.Range(
      '>' + (semver.prerelease(from) ? from.split('-')[0] + '-0' : from) + ' <=' + to.split('-')[0],
    );
    const migrations = [];

    for (const name of collection.listSchematicNames()) {
      const schematic = workflow.engine.createSchematic(name, collection);
      const description = schematic.description as typeof schematic.description & {
        version?: string;
      };
      description.version = coerceVersionNumber(description.version);
      if (!description.version) {
        continue;
      }

      if (semver.satisfies(description.version, migrationRange, { includePrerelease: true })) {
        migrations.push(description as typeof schematic.description & { version: string });
      }
    }

    if (migrations.length === 0) {
      return 0;
    }

    migrations.sort((a, b) => semver.compare(a.version, b.version) || a.name.localeCompare(b.name));

    this.context.logger.info(
      colors.cyan(`** Executing migrations of package '${packageName}' **\n`),
    );

    return this.executePackageMigrations(workflow, migrations, packageName, commit);
  }

  private async executePackageMigrations(
    workflow: NodeWorkflow,
    migrations: Iterable<{ name: string; description: string; collection: { name: string } }>,
    packageName: string,
    commit = false,
  ): Promise<number> {
    const { logger } = this.context;
    for (const migration of migrations) {
      const [title, ...description] = migration.description.split('. ');

      logger.info(
        colors.cyan(colors.symbols.pointer) +
          ' ' +
          colors.bold(title.endsWith('.') ? title : title + '.'),
      );

      if (description.length) {
        logger.info('  ' + description.join('.\n  '));
      }

      const result = await this.executeSchematic(
        workflow,
        migration.collection.name,
        migration.name,
      );
      if (!result.success) {
        return 1;
      }

      logger.info('  Migration completed.');

      // Commit migration
      if (commit) {
        const commitPrefix = `${packageName} migration - ${migration.name}`;
        const commitMessage = migration.description
          ? `${commitPrefix}\n\n${migration.description}`
          : commitPrefix;
        const committed = this.commit(commitMessage);
        if (!committed) {
          // Failed to commit, something went wrong. Abort the update.
          return 1;
        }
      }

      logger.info(''); // Extra trailing newline.
    }

    return 0;
  }

  private async migrateOnly(
    workflow: NodeWorkflow,
    packageName: string,
    rootDependencies: Map<string, PackageTreeNode>,
    options: Options<UpdateCommandArgs>,
  ): Promise<number | void> {
    const { logger } = this.context;
    const packageDependency = rootDependencies.get(packageName);
    let packagePath = packageDependency?.path;
    let packageNode = packageDependency?.package;
    if (packageDependency && !packageNode) {
      logger.error('Package found in package.json but is not installed.');

      return 1;
    } else if (!packageDependency) {
      // Allow running migrations on transitively installed dependencies
      // There can technically be nested multiple versions
      // TODO: If multiple, this should find all versions and ask which one to use
      const packageJson = findPackageJson(this.context.root, packageName);
      if (packageJson) {
        packagePath = path.dirname(packageJson);
        packageNode = await readPackageJson(packageJson);
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
        migrations = packageRequire.resolve(migrations);
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
      return this.executeMigration(
        workflow,
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

    return this.executeMigrations(
      workflow,
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
    rootDependencies: Map<string, PackageTreeNode>,
    options: Options<UpdateCommandArgs>,
    packages: PackageIdentifier[],
  ): Promise<number> {
    const { logger } = this.context;

    const logVerbose = (message: string) => {
      if (options.verbose) {
        logger.info(message);
      }
    };

    const requests: {
      identifier: PackageIdentifier;
      node: PackageTreeNode;
    }[] = [];

    // Validate packages actually are part of the workspace
    for (const pkg of packages) {
      const node = rootDependencies.get(pkg.name);
      if (!node?.package) {
        logger.error(`Package '${pkg.name}' is not a dependency.`);

        return 1;
      }

      // If a specific version is requested and matches the installed version, skip.
      if (pkg.type === 'version' && node.package.version === pkg.fetchSpec) {
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

      let metadata;
      try {
        // Metadata requests are internally cached; multiple requests for same name
        // does not result in additional network traffic
        metadata = await fetchPackageMetadata(packageName, logger, {
          verbose: options.verbose,
        });
      } catch (e) {
        assertIsError(e);
        logger.error(`Error fetching metadata for '${packageName}': ` + e.message);

        return 1;
      }

      // Try to find a package version based on the user requested package specifier
      // registry specifier types are either version, range, or tag
      let manifest: PackageManifest | undefined;
      if (
        requestIdentifier.type === 'version' ||
        requestIdentifier.type === 'range' ||
        requestIdentifier.type === 'tag'
      ) {
        try {
          manifest = pickManifest(metadata, requestIdentifier.fetchSpec);
        } catch (e) {
          assertIsError(e);
          if (e.code === 'ETARGET') {
            // If not found and next was used and user did not provide a specifier, try latest.
            // Package may not have a next tag.
            if (
              requestIdentifier.type === 'tag' &&
              requestIdentifier.fetchSpec === 'next' &&
              !requestIdentifier.rawSpec
            ) {
              try {
                manifest = pickManifest(metadata, 'latest');
              } catch (e) {
                assertIsError(e);
                if (e.code !== 'ETARGET' && e.code !== 'ENOVERSIONS') {
                  throw e;
                }
              }
            }
          } else if (e.code !== 'ENOVERSIONS') {
            throw e;
          }
        }
      }

      if (!manifest) {
        logger.error(
          `Package specified by '${requestIdentifier.raw}' does not exist within the registry.`,
        );

        return 1;
      }

      if (manifest.version === node.package?.version) {
        logger.info(`Package '${packageName}' is already up to date.`);
        continue;
      }

      if (node.package && ANGULAR_PACKAGES_REGEXP.test(node.package.name)) {
        const { name, version } = node.package;
        const toBeInstalledMajorVersion = +manifest.version.split('.')[0];
        const currentMajorVersion = +version.split('.')[0];

        if (toBeInstalledMajorVersion - currentMajorVersion > 1) {
          // Only allow updating a single version at a time.
          if (currentMajorVersion < 6) {
            // Before version 6, the major versions were not always sequential.
            // Example @angular/core skipped version 3, @angular/cli skipped versions 2-5.
            logger.error(
              `Updating multiple major versions of '${name}' at once is not supported. Please migrate each major version individually.\n` +
                `For more information about the update process, see https://update.angular.io/.`,
            );
          } else {
            const nextMajorVersionFromCurrent = currentMajorVersion + 1;

            logger.error(
              `Updating multiple major versions of '${name}' at once is not supported. Please migrate each major version individually.\n` +
                `Run 'ng update ${name}@${nextMajorVersionFromCurrent}' in your workspace directory ` +
                `to update to latest '${nextMajorVersionFromCurrent}.x' version of '${name}'.\n\n` +
                `For more information about the update process, see https://update.angular.io/?v=${currentMajorVersion}.0-${nextMajorVersionFromCurrent}.0`,
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

    const { success } = await this.executeSchematic(
      workflow,
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
      try {
        await fs.rm(path.join(this.context.root, 'node_modules'), {
          force: true,
          recursive: true,
          maxRetries: 3,
        });
      } catch {}

      const installationSuccess = await this.context.packageManager.installAll(
        this.packageManagerForce(options.verbose) ? ['--force'] : [],
        this.context.root,
      );

      if (!installationSuccess) {
        return 1;
      }
    }

    if (success && options.createCommits) {
      if (!this.commit(`Angular CLI update for packages - ${packagesToUpdate.join(', ')}`)) {
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
        const result = await this.executeMigrations(
          workflow,
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
  /**
   * @return Whether or not the commit was successful.
   */
  private commit(message: string): boolean {
    const { logger } = this.context;

    // Check if a commit is needed.
    let commitNeeded: boolean;
    try {
      commitNeeded = hasChangesToCommit();
    } catch (err) {
      logger.error(`  Failed to read Git tree:\n${(err as SpawnSyncReturns<string>).stderr}`);

      return false;
    }

    if (!commitNeeded) {
      logger.info('  No changes to commit after migration.');

      return true;
    }

    // Commit changes and abort on error.
    try {
      createCommit(message);
    } catch (err) {
      logger.error(
        `Failed to commit update (${message}):\n${(err as SpawnSyncReturns<string>).stderr}`,
      );

      return false;
    }

    // Notify user of the commit.
    const hash = findCurrentGitSha();
    const shortMessage = message.split('\n')[0];
    if (hash) {
      logger.info(`  Committed migration step (${getShortHash(hash)}): ${shortMessage}.`);
    } else {
      // Commit was successful, but reading the hash was not. Something weird happened,
      // but nothing that would stop the update. Just log the weirdness and continue.
      logger.info(`  Committed migration step: ${shortMessage}.`);
      logger.warn('  Failed to look up hash of most recent commit, continuing anyways.');
    }

    return true;
  }

  private checkCleanGit(): boolean {
    try {
      const topLevel = execSync('git rev-parse --show-toplevel', {
        encoding: 'utf8',
        stdio: 'pipe',
      });
      const result = execSync('git status --porcelain', { encoding: 'utf8', stdio: 'pipe' });
      if (result.trim().length === 0) {
        return true;
      }

      // Only files inside the workspace root are relevant
      for (const entry of result.split('\n')) {
        const relativeEntry = path.relative(
          path.resolve(this.context.root),
          path.resolve(topLevel.trim(), entry.slice(3).trim()),
        );

        if (!relativeEntry.startsWith('..') && !path.isAbsolute(relativeEntry)) {
          return false;
        }
      }
    } catch {}

    return true;
  }

  /**
   * Checks if the current installed CLI version is older or newer than a compatible version.
   * @returns the version to install or null when there is no update to install.
   */
  private async checkCLIVersion(
    packagesToUpdate: string[],
    verbose = false,
    next = false,
  ): Promise<string | null> {
    const { version } = await fetchPackageManifest(
      `@angular/cli@${this.getCLIUpdateRunnerVersion(packagesToUpdate, next)}`,
      this.context.logger,
      {
        verbose,
        usingYarn: this.context.packageManager.name === PackageManager.Yarn,
      },
    );

    return VERSION.full === version ? null : version;
  }

  private getCLIUpdateRunnerVersion(
    packagesToUpdate: string[] | undefined,
    next: boolean,
  ): string | number {
    if (next) {
      return 'next';
    }

    const updatingAngularPackage = packagesToUpdate?.find((r) => ANGULAR_PACKAGES_REGEXP.test(r));
    if (updatingAngularPackage) {
      // If we are updating any Angular package we can update the CLI to the target version because
      // migrations for @angular/core@13 can be executed using Angular/cli@13.
      // This is same behaviour as `npx @angular/cli@13 update @angular/core@13`.

      // `@angular/cli@13` -> ['', 'angular/cli', '13']
      // `@angular/cli` -> ['', 'angular/cli']
      const tempVersion = coerceVersionNumber(updatingAngularPackage.split('@')[2]);

      return semver.parse(tempVersion)?.major ?? 'latest';
    }

    // When not updating an Angular package we cannot determine which schematic runtime the migration should to be executed in.
    // Typically, we can assume that the `@angular/cli` was updated previously.
    // Example: Angular official packages are typically updated prior to NGRX etc...
    // Therefore, we only update to the latest patch version of the installed major version of the Angular CLI.

    // This is important because we might end up in a scenario where locally Angular v12 is installed, updating NGRX from 11 to 12.
    // We end up using Angular ClI v13 to run the migrations if we run the migrations using the CLI installed major version + 1 logic.
    return VERSION.major;
  }

  private async runTempBinary(packageName: string, args: string[] = []): Promise<number> {
    const { success, tempNodeModules } = await this.context.packageManager.installTemp(packageName);
    if (!success) {
      return 1;
    }

    // Remove version/tag etc... from package name
    // Ex: @angular/cli@latest -> @angular/cli
    const packageNameNoVersion = packageName.substring(0, packageName.lastIndexOf('@'));
    const pkgLocation = join(tempNodeModules, packageNameNoVersion);
    const packageJsonPath = join(pkgLocation, 'package.json');

    // Get a binary location for this package
    let binPath: string | undefined;
    if (existsSync(packageJsonPath)) {
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      if (content) {
        const { bin = {} } = JSON.parse(content);
        const binKeys = Object.keys(bin);

        if (binKeys.length) {
          binPath = resolve(pkgLocation, bin[binKeys[0]]);
        }
      }
    }

    if (!binPath) {
      throw new Error(`Cannot locate bin for temporary package: ${packageNameNoVersion}.`);
    }

    const { status, error } = spawnSync(process.execPath, [binPath, ...args], {
      stdio: 'inherit',
      env: {
        ...process.env,
        NG_DISABLE_VERSION_CHECK: 'true',
        NG_CLI_ANALYTICS: 'false',
      },
    });

    if (status === null && error) {
      throw error;
    }

    return status ?? 0;
  }

  private packageManagerForce(verbose: boolean): boolean {
    // npm 7+ can fail due to it incorrectly resolving peer dependencies that have valid SemVer
    // ranges during an update. Update will set correct versions of dependencies within the
    // package.json file. The force option is set to workaround these errors.
    // Example error:
    // npm ERR! Conflicting peer dependency: @angular/compiler-cli@14.0.0-rc.0
    // npm ERR! node_modules/@angular/compiler-cli
    // npm ERR!   peer @angular/compiler-cli@"^14.0.0 || ^14.0.0-rc" from @angular-devkit/build-angular@14.0.0-rc.0
    // npm ERR!   node_modules/@angular-devkit/build-angular
    // npm ERR!     dev @angular-devkit/build-angular@"~14.0.0-rc.0" from the root project
    if (
      this.context.packageManager.name === PackageManager.Npm &&
      this.context.packageManager.version &&
      semver.gte(this.context.packageManager.version, '7.0.0')
    ) {
      if (verbose) {
        this.context.logger.info(
          'NPM 7+ detected -- enabling force option for package installation',
        );
      }

      return true;
    }

    return false;
  }
}

/**
 * @return Whether or not the working directory has Git changes to commit.
 */
function hasChangesToCommit(): boolean {
  // List all modified files not covered by .gitignore.
  // If any files are returned, then there must be something to commit.

  return execSync('git ls-files -m -d -o --exclude-standard').toString() !== '';
}

/**
 * Precondition: Must have pending changes to commit, they do not need to be staged.
 * Postcondition: The Git working tree is committed and the repo is clean.
 * @param message The commit message to use.
 */
function createCommit(message: string) {
  // Stage entire working tree for commit.
  execSync('git add -A', { encoding: 'utf8', stdio: 'pipe' });

  // Commit with the message passed via stdin to avoid bash escaping issues.
  execSync('git commit --no-verify -F -', { encoding: 'utf8', stdio: 'pipe', input: message });
}

/**
 * @return The Git SHA hash of the HEAD commit. Returns null if unable to retrieve the hash.
 */
function findCurrentGitSha(): string | null {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch {
    return null;
  }
}

function getShortHash(commitHash: string): string {
  return commitHash.slice(0, 9);
}

function coerceVersionNumber(version: string | undefined): string | undefined {
  if (!version) {
    return undefined;
  }

  if (!/^\d{1,30}\.\d{1,30}\.\d{1,30}/.test(version)) {
    const match = version.match(/^\d{1,30}(\.\d{1,30})*/);

    if (!match) {
      return undefined;
    }

    if (!match[1]) {
      version = version.substring(0, match[0].length) + '.0.0' + version.substring(match[0].length);
    } else if (!match[2]) {
      version = version.substring(0, match[0].length) + '.0' + version.substring(match[0].length);
    } else {
      return undefined;
    }
  }

  return semver.valid(version) ?? undefined;
}
