/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as semver from 'semver';
import { Arguments, Option } from '../models/interface';
import { SchematicCommand } from '../models/schematic-command';
import { findUp } from '../utilities/find-up';
import { getPackageManager } from '../utilities/package-manager';
import {
  PackageIdentifier,
  PackageManifest,
  fetchPackageMetadata,
} from '../utilities/package-metadata';
import {
  PackageTreeActual,
  findNodeDependencies,
  readPackageTree,
} from '../utilities/package-tree';
import { Schema as UpdateCommandSchema } from './update';

const npa = require('npm-package-arg');

const oldConfigFileNames = ['.angular-cli.json', 'angular-cli.json'];

export class UpdateCommand extends SchematicCommand<UpdateCommandSchema> {
  public readonly allowMissingWorkspace = true;

  async parseArguments(_schematicOptions: string[], _schema: Option[]): Promise<Arguments> {
    return {};
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

    const packageManager = getPackageManager(this.workspace.root);
    this.logger.info(`Using package manager: '${packageManager}'`);

    // Special handling for Angular CLI 1.x migrations
    if (options.migrateOnly === undefined && options.from === undefined) {
      if (!options.all && packages.length === 1 && packages[0].name === '@angular/cli') {
        const oldConfigFilePath = findUp(oldConfigFileNames, process.cwd());
        if (oldConfigFilePath) {
          options.migrateOnly = true;
          options.from = '1.0.0';
        }
      }
    }

    this.logger.info('Collecting installed dependencies...');

    const packageTree = await readPackageTree(this.workspace.root);
    const rootDependencies = findNodeDependencies(packageTree);

    this.logger.info(`Found ${Object.keys(rootDependencies).length} dependencies.`);

    if (options.all || packages.length === 0) {
      // Either update all packages or show status
      return this.runSchematic({
        collectionName: '@schematics/update',
        schematicName: 'update',
        dryRun: !!options.dryRun,
        showNothingDone: false,
        additionalOptions: {
          force: options.force || false,
          next: options.next || false,
          packageManager,
          packages: options.all ? Object.keys(rootDependencies) : [],
        },
      });
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

      if (options.next) {
        this.logger.warn('"next" option has no effect when using "migrate-only" option.');
      }

      const packageName = packages[0].name;
      let packageNode = rootDependencies[packageName];
      if (typeof packageNode === 'string') {
        this.logger.error('Package found in package.json but is not installed.');

        return 1;
      } else if (!packageNode) {
        // Allow running migrations on transitively installed dependencies
        // There can technically be nested multiple versions
        // TODO: If multiple, this should find all versions and ask which one to use
        const child = packageTree.children.find(c => c.name === packageName);
        if (child) {
          // A link represents a symlinked package so use the actual in this case
          packageNode = child.isLink ? child.target : child;
        }

        if (!packageNode) {
          this.logger.error('Package is not installed.');

          return 1;
        }
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

      return this.runSchematic({
        collectionName: '@schematics/update',
        schematicName: 'migrate',
        dryRun: !!options.dryRun,
        force: false,
        showNothingDone: false,
        additionalOptions: {
          package: packageName,
          collection: migrations,
          from: options.from,
          to: options.to || packageNode.package.version,
        },
      });
    }

    const requests: {
      identifier: PackageIdentifier;
      node: PackageTreeActual | string;
    }[] = [];

    // Validate packages actually are part of the workspace
    for (const pkg of packages) {
      const node = rootDependencies[pkg.name];
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
        metadata = await fetchPackageMetadata(packageName, this.logger);
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

    return this.runSchematic({
      collectionName: '@schematics/update',
      schematicName: 'update',
      dryRun: !!options.dryRun,
      showNothingDone: false,
      additionalOptions: {
        force: options.force || false,
        packageManager,
        packages: packagesToUpdate,
      },
    });
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

    } catch { }

    return true;
  }
}
