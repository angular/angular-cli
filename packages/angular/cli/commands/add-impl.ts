/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { analytics, tags } from '@angular-devkit/core';
import { NodePackageDoesNotSupportSchematics } from '@angular-devkit/schematics/tools';
import { dirname, join } from 'path';
import { intersects, prerelease, rcompare, satisfies, valid, validRange } from 'semver';
import { isPackageNameSafeForAnalytics } from '../models/analytics';
import { Arguments } from '../models/interface';
import { RunSchematicOptions, SchematicCommand } from '../models/schematic-command';
import npmInstall from '../tasks/npm-install';
import { colors } from '../utilities/color';
import { getPackageManager } from '../utilities/package-manager';
import {
  PackageManifest,
  fetchPackageManifest,
  fetchPackageMetadata,
} from '../utilities/package-metadata';
import { Schema as AddCommandSchema } from './add';

const npa = require('npm-package-arg');

export class AddCommand extends SchematicCommand<AddCommandSchema> {
  readonly allowPrivateSchematics = true;
  readonly allowAdditionalArgs = true;

  async run(options: AddCommandSchema & Arguments) {
    if (!options.collection) {
      this.logger.fatal(
        `The "ng add" command requires a name argument to be specified eg. ` +
          `${colors.yellow('ng add [name] ')}. For more details, use "ng help".`,
      );

      return 1;
    }

    let packageIdentifier;
    try {
      packageIdentifier = npa(options.collection);
    } catch (e) {
      this.logger.error(e.message);

      return 1;
    }

    if (packageIdentifier.registry && this.isPackageInstalled(packageIdentifier.name)) {
      // Already installed so just run schematic
      this.logger.info('Skipping installation: Package already installed');

      return this.executeSchematic(packageIdentifier.name, options['--']);
    }

    const packageManager = await getPackageManager(this.workspace.root);
    const usingYarn = packageManager === 'yarn';

    if (packageIdentifier.type === 'tag' && !packageIdentifier.rawSpec) {
      // only package name provided; search for viable version
      // plus special cases for packages that did not have peer deps setup
      let packageMetadata;
      try {
        packageMetadata = await fetchPackageMetadata(packageIdentifier.name, this.logger, {
          registry: options.registry,
          usingYarn,
          verbose: options.verbose,
        });
      } catch (e) {
        this.logger.error('Unable to fetch package metadata: ' + e.message);

        return 1;
      }

      const latestManifest = packageMetadata.tags['latest'];
      if (latestManifest && Object.keys(latestManifest.peerDependencies).length === 0) {
        if (latestManifest.name === '@angular/pwa') {
          const version = await this.findProjectVersion('@angular/cli');
          // tslint:disable-next-line:no-any
          const semverOptions = { includePrerelease: true } as any;

          if (
            version &&
            ((validRange(version) && intersects(version, '7', semverOptions)) ||
              (valid(version) && satisfies(version, '7', semverOptions)))
          ) {
            packageIdentifier = npa.resolve('@angular/pwa', '0.12');
          }
        }
      } else if (!latestManifest || (await this.hasMismatchedPeer(latestManifest))) {
        // 'latest' is invalid so search for most recent matching package
        const versionManifests = Array.from(packageMetadata.versions.values()).filter(
          value => !prerelease(value.version),
        );

        versionManifests.sort((a, b) => rcompare(a.version, b.version, true));

        let newIdentifier;
        for (const versionManifest of versionManifests) {
          if (!(await this.hasMismatchedPeer(versionManifest))) {
            newIdentifier = npa.resolve(packageIdentifier.name, versionManifest.version);
            break;
          }
        }

        if (!newIdentifier) {
          this.logger.warn("Unable to find compatible package.  Using 'latest'.");
        } else {
          packageIdentifier = newIdentifier;
        }
      }
    }

    let collectionName = packageIdentifier.name;
    if (!packageIdentifier.registry) {
      try {
        const manifest = await fetchPackageManifest(packageIdentifier, this.logger, {
          registry: options.registry,
          verbose: options.verbose,
          usingYarn,
        });

        collectionName = manifest.name;

        if (await this.hasMismatchedPeer(manifest)) {
          this.logger.warn(
            'Package has unmet peer dependencies. Adding the package may not succeed.',
          );
        }
      } catch (e) {
        this.logger.error('Unable to fetch package manifest: ' + e.message);

        return 1;
      }
    }

    await npmInstall(packageIdentifier.raw, this.logger, packageManager, this.workspace.root);

    return this.executeSchematic(collectionName, options['--']);
  }

  async reportAnalytics(
    paths: string[],
    options: AddCommandSchema & Arguments,
    dimensions: (boolean | number | string)[] = [],
    metrics: (boolean | number | string)[] = [],
  ): Promise<void> {
    const collection = options.collection;

    // Add the collection if it's safe listed.
    if (collection && isPackageNameSafeForAnalytics(collection)) {
      dimensions[analytics.NgCliAnalyticsDimensions.NgAddCollection] = collection;
    } else {
      delete dimensions[analytics.NgCliAnalyticsDimensions.NgAddCollection];
    }

    return super.reportAnalytics(paths, options, dimensions, metrics);
  }

  private isPackageInstalled(name: string): boolean {
    try {
      require.resolve(join(name, 'package.json'), { paths: [this.workspace.root] });

      return true;
    } catch (e) {
      if (e.code !== 'MODULE_NOT_FOUND') {
        throw e;
      }
    }

    return false;
  }

  private async executeSchematic(
    collectionName: string,
    options: string[] = [],
  ): Promise<number | void> {
    const runOptions: RunSchematicOptions = {
      schematicOptions: options,
      collectionName,
      schematicName: 'ng-add',
      dryRun: false,
      force: false,
    };

    try {
      return await this.runSchematic(runOptions);
    } catch (e) {
      if (e instanceof NodePackageDoesNotSupportSchematics) {
        this.logger.error(tags.oneLine`
          The package that you are trying to add does not support schematics. You can try using
          a different version of the package or contact the package author to add ng-add support.
        `);

        return 1;
      }

      throw e;
    }
  }

  private async findProjectVersion(name: string): Promise<string | null> {
    let installedPackage;
    try {
      installedPackage = require.resolve(join(name, 'package.json'), {
        paths: [this.workspace.root],
      });
    } catch {}

    if (installedPackage) {
      try {
        const installed = await fetchPackageManifest(dirname(installedPackage), this.logger);

        return installed.version;
      } catch {}
    }

    let projectManifest;
    try {
      projectManifest = await fetchPackageManifest(this.workspace.root, this.logger);
    } catch {}

    if (projectManifest) {
      const version = projectManifest.dependencies[name] || projectManifest.devDependencies[name];
      if (version) {
        return version;
      }
    }

    return null;
  }

  private async hasMismatchedPeer(manifest: PackageManifest): Promise<boolean> {
    for (const peer in manifest.peerDependencies) {
      let peerIdentifier;
      try {
        peerIdentifier = npa.resolve(peer, manifest.peerDependencies[peer]);
      } catch {
        this.logger.warn(`Invalid peer dependency ${peer} found in package.`);
        continue;
      }

      if (peerIdentifier.type === 'version' || peerIdentifier.type === 'range') {
        try {
          const version = await this.findProjectVersion(peer);
          if (!version) {
            continue;
          }

          // tslint:disable-next-line:no-any
          const options = { includePrerelease: true } as any;

          if (
            !intersects(version, peerIdentifier.rawSpec, options) &&
            !satisfies(version, peerIdentifier.rawSpec, options)
          ) {
            return true;
          }
        } catch {
          // Not found or invalid so ignore
          continue;
        }
      } else {
        // type === 'tag' | 'file' | 'directory' | 'remote' | 'git'
        // Cannot accurately compare these as the tag/location may have changed since install
      }
    }

    return false;
  }
}
