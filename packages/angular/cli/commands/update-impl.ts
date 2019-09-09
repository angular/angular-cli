/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { normalize, virtualFs } from '@angular-devkit/core';
import { NodeJsSyncHost } from '@angular-devkit/core/node';
import { UnsuccessfulWorkflowExecution } from '@angular-devkit/schematics';
import { NodeWorkflow, validateOptionsWithSchema } from '@angular-devkit/schematics/tools';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as semver from 'semver';
import { Command } from '../models/command';
import { Arguments } from '../models/interface';
import { colors } from '../utilities/color';
import { getPackageManager } from '../utilities/package-manager';
import {
  PackageIdentifier,
  PackageManifest,
  PackageMetadata,
  fetchPackageMetadata,
} from '../utilities/package-metadata';
import { PackageTreeNode, findNodeDependencies, readPackageTree } from '../utilities/package-tree';
import { Schema as UpdateCommandSchema } from './update';

const npa = require('npm-package-arg');

const oldConfigFileNames = ['.angular-cli.json', 'angular-cli.json'];

export class UpdateCommand extends Command<UpdateCommandSchema> {
  public readonly allowMissingWorkspace = true;

  private workflow: NodeWorkflow;

  async initialize() {
    this.workflow = new NodeWorkflow(
      new virtualFs.ScopedHost(new NodeJsSyncHost(), normalize(this.workspace.root)),
      {
        packageManager: await getPackageManager(this.workspace.root),
        root: normalize(this.workspace.root),
      },
    );

    this.workflow.engineHost.registerOptionsTransform(
      validateOptionsWithSchema(this.workflow.registry),
    );
  }

  async executeSchematic(
    collection: string,
    schematic: string,
    options = {},
  ): Promise<{ success: boolean; files: Set<string> }> {
    let error = false;
    const logs: string[] = [];
    const files = new Set<string>();

    const reporterSubscription = this.workflow.reporter.subscribe(event => {
      // Strip leading slash to prevent confusion.
      const eventPath = event.path.startsWith('/') ? event.path.substr(1) : event.path;

      switch (event.kind) {
        case 'error':
          error = true;
          const desc = event.description == 'alreadyExist' ? 'already exists' : 'does not exist.';
          this.logger.error(`ERROR! ${eventPath} ${desc}.`);
          break;
        case 'update':
          logs.push(`${colors.whiteBright('UPDATE')} ${eventPath} (${event.content.length} bytes)`);
          files.add(eventPath);
          break;
        case 'create':
          logs.push(`${colors.green('CREATE')} ${eventPath} (${event.content.length} bytes)`);
          files.add(eventPath);
          break;
        case 'delete':
          logs.push(`${colors.yellow('DELETE')} ${eventPath}`);
          files.add(eventPath);
          break;
        case 'rename':
          logs.push(`${colors.blue('RENAME')} ${eventPath} => ${event.to}`);
          files.add(eventPath);
          break;
      }
    });

    const lifecycleSubscription = this.workflow.lifeCycle.subscribe(event => {
      if (event.kind == 'end' || event.kind == 'post-tasks-start') {
        if (!error) {
          // Output the logging queue, no error happened.
          logs.forEach(log => this.logger.info(log));
        }
      }
    });

    // TODO: Allow passing a schematic instance directly
    try {
      await this.workflow
        .execute({
          collection,
          schematic,
          options,
          logger: this.logger,
        })
        .toPromise();

      reporterSubscription.unsubscribe();
      lifecycleSubscription.unsubscribe();

      return { success: !error, files };
    } catch (e) {
      if (e instanceof UnsuccessfulWorkflowExecution) {
        this.logger.error('The update failed. See above.');
      } else {
        this.logger.fatal(e.message);
      }

      return { success: false, files };
    }
  }

  async executeMigrations(
    packageName: string,
    collectionPath: string,
    range: semver.Range,
    commit = false,
  ) {
    const collection = this.workflow.engine.createCollection(collectionPath);

    const migrations = [];
    for (const name of collection.listSchematicNames()) {
      const schematic = this.workflow.engine.createSchematic(name, collection);
      const description = schematic.description as typeof schematic.description & {
        version?: string;
      };
      if (!description.version) {
        continue;
      }

      if (semver.satisfies(description.version, range, { includePrerelease: true })) {
        migrations.push(description as typeof schematic.description & { version: string });
      }
    }

    if (migrations.length === 0) {
      return true;
    }

    const startingGitSha = this.findCurrentGitSha();

    migrations.sort((a, b) => semver.compare(a.version, b.version) || a.name.localeCompare(b.name));

    for (const migration of migrations) {
      this.logger.info(
        `** Executing migrations for version ${migration.version} of package '${packageName}' **`,
      );

      const result = await this.executeSchematic(migration.collection.name, migration.name);
      if (!result.success) {
        if (startingGitSha !== null) {
          const currentGitSha = this.findCurrentGitSha();
          if (currentGitSha !== startingGitSha) {
            this.logger.warn(`git HEAD was at ${startingGitSha} before migrations.`);
          }
        }

        return false;
      }

      // Commit migration
      if (commit) {
        let message = `migrate workspace for ${packageName}@${migration.version}`;
        if (migration.description) {
          message += '\n' + migration.description;
        }
        // TODO: Use result.files once package install tasks are accounted
        this.createCommit(message, []);
      }
    }
  }

  // tslint:disable-next-line:no-big-function
  async run(options: UpdateCommandSchema & Arguments) {
    const packages: PackageIdentifier[] = [];
    for (const request of options['--'] || []) {
      try {
        const packageIdentifier: PackageIdentifier = npa(request);

        // only registry identifiers are supported
        if (!packageIdentifier.registry) {
          this.logger.error(`Package '${request}' is not a registry package identifer.`);

          return 1;
        }

        if (packages.some(v => v.name === packageIdentifier.name)) {
          this.logger.error(`Duplicate package '${packageIdentifier.name}' specified.`);

          return 1;
        }

        // If next option is used and no specifier supplied, use next tag
        if (options.next && !packageIdentifier.rawSpec) {
          packageIdentifier.fetchSpec = 'next';
        }

        packages.push(packageIdentifier);
      } catch (e) {
        this.logger.error(e.message);

        return 1;
      }
    }

    if (options.all && packages.length > 0) {
      this.logger.error('Cannot specify packages when using the "all" option.');

      return 1;
    } else if (options.all && options.migrateOnly) {
      this.logger.error('Cannot use "all" option with "migrate-only" option.');

      return 1;
    } else if (!options.migrateOnly && (options.from || options.to)) {
      this.logger.error('Can only use "from" or "to" options with "migrate-only" option.');

      return 1;
    }

    // If not asking for status then check for a clean git repository.
    // This allows the user to easily reset any changes from the update.
    const statusCheck = packages.length === 0 && !options.all;
    if (!statusCheck && !this.checkCleanGit()) {
      if (options.allowDirty) {
        this.logger.warn(
          'Repository is not clean.  Update changes will be mixed with pre-existing changes.',
        );
      } else {
        this.logger.error(
          'Repository is not clean.  Please commit or stash any changes before updating.',
        );

        return 2;
      }
    }

    const packageManager = await getPackageManager(this.workspace.root);
    this.logger.info(`Using package manager: '${packageManager}'`);

    // Special handling for Angular CLI 1.x migrations
    if (
      options.migrateOnly === undefined &&
      options.from === undefined &&
      !options.all &&
      packages.length === 1 &&
      packages[0].name === '@angular/cli' &&
      this.workspace.configFile &&
      oldConfigFileNames.includes(this.workspace.configFile)
    ) {
      options.migrateOnly = true;
      options.from = '1.0.0';
    }

    this.logger.info('Collecting installed dependencies...');

    const packageTree = await readPackageTree(this.workspace.root);
    const rootDependencies = findNodeDependencies(packageTree);

    this.logger.info(`Found ${Object.keys(rootDependencies).length} dependencies.`);

    if (options.all || packages.length === 0) {
      // Either update all packages or show status
      const { success } = await this.executeSchematic('@schematics/update', 'update', {
        force: options.force || false,
        next: options.next || false,
        verbose: options.verbose || false,
        packageManager,
        packages: options.all ? Object.keys(rootDependencies) : [],
      });

      return success ? 0 : 1;
    }

    if (options.migrateOnly) {
      if (!options.from) {
        this.logger.error('"from" option is required when using the "migrate-only" option.');

        return 1;
      } else if (packages.length !== 1) {
        this.logger.error(
          'A single package must be specified when using the "migrate-only" option.',
        );

        return 1;
      }

      const from = coerceVersionNumber(options.from);
      if (!from) {
        this.logger.error(`"from" value [${options.from}] is not a valid version.`);

        return 1;
      }

      if (options.next) {
        this.logger.warn('"next" option has no effect when using "migrate-only" option.');
      }

      const packageName = packages[0].name;
      const packageDependency = rootDependencies[packageName];
      let packageNode = packageDependency && packageDependency.node;
      if (packageDependency && !packageNode) {
        this.logger.error('Package found in package.json but is not installed.');

        return 1;
      } else if (!packageDependency) {
        // Allow running migrations on transitively installed dependencies
        // There can technically be nested multiple versions
        // TODO: If multiple, this should find all versions and ask which one to use
        const child = packageTree.children.find(c => c.name === packageName);
        if (child) {
          packageNode = child;
        }
      }

      if (!packageNode) {
        this.logger.error('Package is not installed.');

        return 1;
      }

      const updateMetadata = packageNode.package['ng-update'];
      let migrations = updateMetadata && updateMetadata.migrations;
      if (migrations === undefined) {
        this.logger.error('Package does not provide migrations.');

        return 1;
      } else if (typeof migrations !== 'string') {
        this.logger.error('Package contains a malformed migrations field.');

        return 1;
      } else if (path.posix.isAbsolute(migrations) || path.win32.isAbsolute(migrations)) {
        this.logger.error(
          'Package contains an invalid migrations field. Absolute paths are not permitted.',
        );

        return 1;
      }

      // Normalize slashes
      migrations = migrations.replace(/\\/g, '/');

      if (migrations.startsWith('../')) {
        this.logger.error(
          'Package contains an invalid migrations field. ' +
            'Paths outside the package root are not permitted.',
        );

        return 1;
      }

      // Check if it is a package-local location
      const localMigrations = path.join(packageNode.path, migrations);
      if (fs.existsSync(localMigrations)) {
        migrations = localMigrations;
      } else {
        // Try to resolve from package location.
        // This avoids issues with package hoisting.
        try {
          migrations = require.resolve(migrations, { paths: [packageNode.path] });
        } catch (e) {
          if (e.code === 'MODULE_NOT_FOUND') {
            this.logger.error('Migrations for package were not found.');
          } else {
            this.logger.error(`Unable to resolve migrations for package.  [${e.message}]`);
          }

          return 1;
        }
      }

      const migrationRange = new semver.Range(
        '>' + from + ' <=' + (options.to || packageNode.package.version),
      );

      const result = await this.executeMigrations(
        packageName,
        migrations,
        migrationRange,
        !options.skipCommits,
      );

      return result ? 1 : 0;
    }

    const requests: {
      identifier: PackageIdentifier;
      node: PackageTreeNode | string;
    }[] = [];

    // Validate packages actually are part of the workspace
    for (const pkg of packages) {
      const node = rootDependencies[pkg.name] && rootDependencies[pkg.name].node;
      if (!node) {
        this.logger.error(`Package '${pkg.name}' is not a dependency.`);

        return 1;
      }

      // If a specific version is requested and matches the installed version, skip.
      if (
        pkg.type === 'version' &&
        typeof node === 'object' &&
        node.package.version === pkg.fetchSpec
      ) {
        this.logger.info(`Package '${pkg.name}' is already at '${pkg.fetchSpec}'.`);
        continue;
      }

      requests.push({ identifier: pkg, node });
    }

    if (requests.length === 0) {
      return 0;
    }

    const packagesToUpdate: string[] = [];

    this.logger.info('Fetching dependency metadata from registry...');
    for (const { identifier: requestIdentifier, node } of requests) {
      const packageName = requestIdentifier.name;

      let metadata;
      try {
        // Metadata requests are internally cached; multiple requests for same name
        // does not result in additional network traffic
        metadata = await fetchPackageMetadata(packageName, this.logger, {
          verbose: options.verbose,
        });
      } catch (e) {
        this.logger.error(`Error fetching metadata for '${packageName}': ` + e.message);

        return 1;
      }

      // Try to find a package version based on the user requested package specifier
      // registry specifier types are either version, range, or tag
      let manifest: PackageManifest | undefined;
      if (requestIdentifier.type === 'version') {
        manifest = metadata.versions.get(requestIdentifier.fetchSpec);
      } else if (requestIdentifier.type === 'range') {
        const maxVersion = semver.maxSatisfying(
          Array.from(metadata.versions.keys()),
          requestIdentifier.fetchSpec,
        );
        if (maxVersion) {
          manifest = metadata.versions.get(maxVersion);
        }
      } else if (requestIdentifier.type === 'tag') {
        manifest = metadata.tags[requestIdentifier.fetchSpec];
      }

      if (!manifest) {
        this.logger.error(
          `Package specified by '${requestIdentifier.raw}' does not exist within the registry.`,
        );

        return 1;
      }

      if (
        (typeof node === 'string' && manifest.version === node) ||
        (typeof node === 'object' && manifest.version === node.package.version)
      ) {
        this.logger.info(`Package '${packageName}' is already up to date.`);
        continue;
      }

      packagesToUpdate.push(requestIdentifier.toString());
    }

    if (packagesToUpdate.length === 0) {
      return 0;
    }

    const { success } = await this.executeSchematic('@schematics/update', 'update', {
      verbose: options.verbose || false,
      force: options.force || false,
      packageManager,
      packages: packagesToUpdate,
    });

    return success ? 0 : 1;
  }

  checkCleanGit() {
    try {
      const result = execSync('git status --porcelain', { encoding: 'utf8', stdio: 'pipe' });
      if (result.trim().length === 0) {
        return true;
      }

      // Only files inside the workspace root are relevant
      for (const entry of result.split('\n')) {
        const relativeEntry = path.relative(
          path.resolve(this.workspace.root),
          path.resolve(entry.slice(3).trim()),
        );

        if (!relativeEntry.startsWith('..') && !path.isAbsolute(relativeEntry)) {
          return false;
        }
      }
    } catch {}

    return true;
  }

  createCommit(message: string, files: string[]) {
    try {
      execSync('git add -A ' + files.join(' '), { encoding: 'utf8', stdio: 'pipe' });

      execSync(`git commit --no-verify -m "${message}"`, { encoding: 'utf8', stdio: 'pipe' });
    } catch (error) {}
  }

  findCurrentGitSha(): string | null {
    try {
      const result = execSync('git rev-parse HEAD', { encoding: 'utf8', stdio: 'pipe' });

      return result.trim();
    } catch {
      return null;
    }
  }
}

function coerceVersionNumber(version: string): string | null {
  if (!version.match(/^\d{1,30}\.\d{1,30}\.\d{1,30}/)) {
    const match = version.match(/^\d{1,30}(\.\d{1,30})*/);

    if (!match) {
      return null;
    }

    if (!match[1]) {
      version = version.substr(0, match[0].length) + '.0.0' + version.substr(match[0].length);
    } else if (!match[2]) {
      version = version.substr(0, match[0].length) + '.0' + version.substr(match[0].length);
    } else {
      return null;
    }
  }

  return semver.valid(version);
}
