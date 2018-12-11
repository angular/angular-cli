/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-global-tslint-disable no-any
import { tags, terminal } from '@angular-devkit/core';
import { ModuleNotFoundException, resolve } from '@angular-devkit/core/node';
import { NodePackageDoesNotSupportSchematics } from '@angular-devkit/schematics/tools';
import { dirname } from 'path';
import { intersects, prerelease, rcompare, satisfies, valid, validRange } from 'semver';
import { parseOptions } from '../models/command-runner';
import { SchematicCommand } from '../models/schematic-command';
import { NpmInstall } from '../tasks/npm-install';
import { getPackageManager } from '../utilities/config';
import {
  PackageManifest,
  fetchPackageManifest,
  fetchPackageMetadata,
} from '../utilities/package-metadata';

const npa = require('npm-package-arg');

export class AddCommand extends SchematicCommand {
  readonly allowPrivateSchematics = true;
  readonly packageManager = getPackageManager();

  private async _parseSchematicOptions(collectionName: string): Promise<any> {
    const schematicOptions = await this.getOptions({
      schematicName: 'ng-add',
      collectionName,
    });
    this.addOptions(schematicOptions);

    return parseOptions(this._rawArgs, this.options);
  }

  validate(options: any) {
    const collectionName = options._[0];

    if (!collectionName) {
      this.logger.fatal(
        `The "ng add" command requires a name argument to be specified eg. `
        + `${terminal.yellow('ng add [name] ')}. For more details, use "ng help".`,
      );

      return false;
    }

    return true;
  }

  async run(options: any) {
    const firstArg = options._[0];

    if (!firstArg) {
      this.logger.fatal(
        `The "ng add" command requires a name argument to be specified eg. `
        + `${terminal.yellow('ng add [name] ')}. For more details, use "ng help".`,
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

      // Reparse the options with the new schematic accessible.
      options = await this._parseSchematicOptions(packageIdentifier.name);

      return this.executeSchematic(packageIdentifier.name, options);
    }

    const usingYarn = this.packageManager === 'yarn';

    if (packageIdentifier.type === 'tag' && !packageIdentifier.rawSpec) {
      // only package name provided; search for viable version
      // plus special cases for packages that did not have peer deps setup
      let packageMetadata;
      try {
        packageMetadata = await fetchPackageMetadata(
          packageIdentifier.name,
          this.logger,
          { usingYarn },
        );
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

          if (version
              && ((validRange(version) && intersects(version, '6', semverOptions))
                  || (valid(version) && satisfies(version, '6', semverOptions)))) {
            packageIdentifier = npa.resolve('@angular/pwa', 'v6-lts');
          }
        }
      } else if (!latestManifest || (await this.hasMismatchedPeer(latestManifest))) {
        // 'latest' is invalid so search for most recent matching package
        const versionManifests = Array.from(packageMetadata.versions.values())
          .filter(value => !prerelease(value.version));

        versionManifests.sort((a, b) => rcompare(a.version, b.version, true));

        let newIdentifier;
        for (const versionManifest of versionManifests) {
          if (!(await this.hasMismatchedPeer(versionManifest))) {
            newIdentifier = npa.resolve(packageIdentifier.name, versionManifest.version);
            break;
          }
        }

        if (!newIdentifier) {
          this.logger.warn('Unable to find compatible package.  Using \'latest\'.');
        } else {
          packageIdentifier = newIdentifier;
        }
      }
    }

    let collectionName = packageIdentifier.name;
    if (!packageIdentifier.registry) {
      try {
        const manifest = await fetchPackageManifest(
          packageIdentifier,
          this.logger,
          { usingYarn },
        );

        collectionName = manifest.name;

        if (await this.hasMismatchedPeer(manifest)) {
          console.warn('Package has unmet peer dependencies. Adding the package may not succeed.');
        }
      } catch (e) {
        this.logger.error('Unable to fetch package manifest: ' + e.message);

        return 1;
      }
    }

    const npmInstall: NpmInstall = require('../tasks/npm-install').default;

    // We don't actually add the package to package.json, that would be the work of the package
    // itself.
    await npmInstall(
      packageIdentifier.raw,
      this.logger,
      this.packageManager,
      this.project.root,
    );

    // Reparse the options with the new schematic accessible.
    options = await this._parseSchematicOptions(collectionName);

    return this.executeSchematic(collectionName, options);
  }

  private isPackageInstalled(name: string): boolean {
    try {
      resolve(name, { checkLocal: true, basedir: this.project.root });

      return true;
    } catch (e) {
      if (!(e instanceof ModuleNotFoundException)) {
        throw e;
      }
    }

    return false;
  }

  private async executeSchematic(
    collectionName: string,
    options?: string[],
  ): Promise<number | void> {
    const runOptions = {
      schematicOptions: options || [],
      workingDir: this.project.root,
      collectionName,
      schematicName: 'ng-add',
      allowPrivate: true,
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
      installedPackage = resolve(
        name,
        { checkLocal: true, basedir: this.project.root, resolvePackageJson: true },
      );
    } catch { }

    if (installedPackage) {
      try {
        const installed = await fetchPackageManifest(dirname(installedPackage), this.logger);

        return installed.version;
      } catch {}
    }

    let projectManifest;
    try {
      projectManifest = await fetchPackageManifest(this.project.root, this.logger);
    } catch {}

    if (projectManifest) {
      let version = projectManifest.dependencies[name];
      if (version) {
        return version;
      }

      version = projectManifest.devDependencies[name];
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

          if (!intersects(version, peerIdentifier.rawSpec, options)
              && !satisfies(version, peerIdentifier.rawSpec, options)) {
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
