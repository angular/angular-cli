/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { tags } from '@angular-devkit/core';
import { NodePackageDoesNotSupportSchematics } from '@angular-devkit/schematics/tools';
import { createRequire } from 'module';
import npa from 'npm-package-arg';
import { dirname, join } from 'path';
import { Range, compare, intersects, prerelease, satisfies, valid } from 'semver';
import { Argv } from 'yargs';
import { PackageManager } from '../../../lib/config/workspace-schema';
import {
  CommandModuleImplementation,
  Options,
  OtherOptions,
} from '../../command-builder/command-module';
import {
  SchematicsCommandArgs,
  SchematicsCommandModule,
} from '../../command-builder/schematics-command-module';
import { colors } from '../../utilities/color';
import { assertIsError } from '../../utilities/error';
import {
  NgAddSaveDependency,
  PackageManifest,
  fetchPackageManifest,
  fetchPackageMetadata,
} from '../../utilities/package-metadata';
import { askConfirmation } from '../../utilities/prompt';
import { Spinner } from '../../utilities/spinner';
import { isTTY } from '../../utilities/tty';
import { VERSION } from '../../utilities/version';

interface AddCommandArgs extends SchematicsCommandArgs {
  collection: string;
  verbose?: boolean;
  registry?: string;
  'skip-confirmation'?: boolean;
}

/**
 * The set of packages that should have certain versions excluded from consideration
 * when attempting to find a compatible version for a package.
 * The key is a package name and the value is a SemVer range of versions to exclude.
 */
const packageVersionExclusions: Record<string, string | Range> = {
  // @angular/localize@9.x and earlier versions as well as @angular/localize@10.0 prereleases do not have peer dependencies setup.
  '@angular/localize': '<10.0.0',
  // @angular/material@7.x versions have unbounded peer dependency ranges (>=7.0.0).
  '@angular/material': '7.x',
};

export class AddCommandModule
  extends SchematicsCommandModule
  implements CommandModuleImplementation<AddCommandArgs>
{
  command = 'add <collection>';
  describe = 'Adds support for an external library to your project.';
  longDescriptionPath = join(__dirname, 'long-description.md');
  protected override allowPrivateSchematics = true;
  private readonly schematicName = 'ng-add';
  private rootRequire = createRequire(this.context.root + '/');

  override async builder(argv: Argv): Promise<Argv<AddCommandArgs>> {
    const localYargs = (await super.builder(argv))
      .positional('collection', {
        description: 'The package to be added.',
        type: 'string',
        demandOption: true,
      })
      .option('registry', { description: 'The NPM registry to use.', type: 'string' })
      .option('verbose', {
        description: 'Display additional details about internal operations during execution.',
        type: 'boolean',
        default: false,
      })
      .option('skip-confirmation', {
        description:
          'Skip asking a confirmation prompt before installing and executing the package. ' +
          'Ensure package name is correct prior to using this option.',
        type: 'boolean',
        default: false,
      })
      // Prior to downloading we don't know the full schema and therefore we cannot be strict on the options.
      // Possibly in the future update the logic to use the following syntax:
      // `ng add @angular/localize -- --package-options`.
      .strict(false);

    const collectionName = await this.getCollectionName();
    const workflow = await this.getOrCreateWorkflowForBuilder(collectionName);

    try {
      const collection = workflow.engine.createCollection(collectionName);
      const options = await this.getSchematicOptions(collection, this.schematicName, workflow);

      return this.addSchemaOptionsToCommand(localYargs, options);
    } catch (error) {
      // During `ng add` prior to the downloading of the package
      // we are not able to resolve and create a collection.
      // Or when the the collection value is a path to a tarball.
    }

    return localYargs;
  }

  // eslint-disable-next-line max-lines-per-function
  async run(options: Options<AddCommandArgs> & OtherOptions): Promise<number | void> {
    const { logger, packageManager } = this.context;
    const { verbose, registry, collection, skipConfirmation } = options;
    packageManager.ensureCompatibility();

    let packageIdentifier;
    try {
      packageIdentifier = npa(collection);
    } catch (e) {
      assertIsError(e);
      logger.error(e.message);

      return 1;
    }

    if (
      packageIdentifier.name &&
      packageIdentifier.registry &&
      this.isPackageInstalled(packageIdentifier.name)
    ) {
      const validVersion = await this.isProjectVersionValid(packageIdentifier);
      if (validVersion) {
        // Already installed so just run schematic
        logger.info('Skipping installation: Package already installed');

        return this.executeSchematic({ ...options, collection: packageIdentifier.name });
      }
    }

    const spinner = new Spinner();

    spinner.start('Determining package manager...');
    const usingYarn = packageManager.name === PackageManager.Yarn;
    spinner.info(`Using package manager: ${colors.grey(packageManager.name)}`);

    if (packageIdentifier.name && packageIdentifier.type === 'tag' && !packageIdentifier.rawSpec) {
      // only package name provided; search for viable version
      // plus special cases for packages that did not have peer deps setup
      spinner.start('Searching for compatible package version...');

      let packageMetadata;
      try {
        packageMetadata = await fetchPackageMetadata(packageIdentifier.name, logger, {
          registry,
          usingYarn,
          verbose,
        });
      } catch (e) {
        assertIsError(e);
        spinner.fail(`Unable to load package information from registry: ${e.message}`);

        return 1;
      }

      // Start with the version tagged as `latest` if it exists
      const latestManifest = packageMetadata.tags['latest'];
      if (latestManifest) {
        packageIdentifier = npa.resolve(latestManifest.name, latestManifest.version);
      }

      // Adjust the version based on name and peer dependencies
      if (
        latestManifest?.peerDependencies &&
        Object.keys(latestManifest.peerDependencies).length === 0
      ) {
        spinner.succeed(
          `Found compatible package version: ${colors.grey(packageIdentifier.toString())}.`,
        );
      } else if (!latestManifest || (await this.hasMismatchedPeer(latestManifest))) {
        // 'latest' is invalid so search for most recent matching package

        // Allow prelease versions if the CLI itself is a prerelease
        const allowPrereleases = prerelease(VERSION.full);

        const versionExclusions = packageVersionExclusions[packageMetadata.name];
        const versionManifests = Object.values(packageMetadata.versions).filter(
          (value: PackageManifest) => {
            // Prerelease versions are not stable and should not be considered by default
            if (!allowPrereleases && prerelease(value.version)) {
              return false;
            }
            // Deprecated versions should not be used or considered
            if (value.deprecated) {
              return false;
            }
            // Excluded package versions should not be considered
            if (
              versionExclusions &&
              satisfies(value.version, versionExclusions, { includePrerelease: true })
            ) {
              return false;
            }

            return true;
          },
        );

        // Sort in reverse SemVer order so that the newest compatible version is chosen
        versionManifests.sort((a, b) => compare(b.version, a.version, true));

        let newIdentifier;
        for (const versionManifest of versionManifests) {
          if (!(await this.hasMismatchedPeer(versionManifest))) {
            newIdentifier = npa.resolve(versionManifest.name, versionManifest.version);
            break;
          }
        }

        if (!newIdentifier) {
          spinner.warn("Unable to find compatible package. Using 'latest' tag.");
        } else {
          packageIdentifier = newIdentifier;
          spinner.succeed(
            `Found compatible package version: ${colors.grey(packageIdentifier.toString())}.`,
          );
        }
      } else {
        spinner.succeed(
          `Found compatible package version: ${colors.grey(packageIdentifier.toString())}.`,
        );
      }
    }

    let collectionName = packageIdentifier.name;
    let savePackage: NgAddSaveDependency | undefined;

    try {
      spinner.start('Loading package information from registry...');
      const manifest = await fetchPackageManifest(packageIdentifier.toString(), logger, {
        registry,
        verbose,
        usingYarn,
      });

      savePackage = manifest['ng-add']?.save;
      collectionName = manifest.name;

      if (await this.hasMismatchedPeer(manifest)) {
        spinner.warn('Package has unmet peer dependencies. Adding the package may not succeed.');
      } else {
        spinner.succeed(`Package information loaded.`);
      }
    } catch (e) {
      assertIsError(e);
      spinner.fail(`Unable to fetch package information for '${packageIdentifier}': ${e.message}`);

      return 1;
    }

    if (!skipConfirmation) {
      const confirmationResponse = await askConfirmation(
        `\nThe package ${colors.blue(packageIdentifier.raw)} will be installed and executed.\n` +
          'Would you like to proceed?',
        true,
        false,
      );

      if (!confirmationResponse) {
        if (!isTTY()) {
          logger.error(
            'No terminal detected. ' +
              `'--skip-confirmation' can be used to bypass installation confirmation. ` +
              `Ensure package name is correct prior to '--skip-confirmation' option usage.`,
          );
        }

        logger.error('Command aborted.');

        return 1;
      }
    }

    if (savePackage === false) {
      // Temporary packages are located in a different directory
      // Hence we need to resolve them using the temp path
      const { success, tempNodeModules } = await packageManager.installTemp(
        packageIdentifier.raw,
        registry ? [`--registry="${registry}"`] : undefined,
      );
      const tempRequire = createRequire(tempNodeModules + '/');
      const resolvedCollectionPath = tempRequire.resolve(join(collectionName, 'package.json'));

      if (!success) {
        return 1;
      }

      collectionName = dirname(resolvedCollectionPath);
    } else {
      const success = await packageManager.install(
        packageIdentifier.raw,
        savePackage,
        registry ? [`--registry="${registry}"`] : undefined,
      );

      if (!success) {
        return 1;
      }
    }

    return this.executeSchematic({ ...options, collection: collectionName });
  }

  private async isProjectVersionValid(packageIdentifier: npa.Result): Promise<boolean> {
    if (!packageIdentifier.name) {
      return false;
    }

    let validVersion = false;
    const installedVersion = await this.findProjectVersion(packageIdentifier.name);
    if (installedVersion) {
      if (packageIdentifier.type === 'range' && packageIdentifier.fetchSpec) {
        validVersion = satisfies(installedVersion, packageIdentifier.fetchSpec);
      } else if (packageIdentifier.type === 'version') {
        const v1 = valid(packageIdentifier.fetchSpec);
        const v2 = valid(installedVersion);
        validVersion = v1 !== null && v1 === v2;
      } else if (!packageIdentifier.rawSpec) {
        validVersion = true;
      }
    }

    return validVersion;
  }

  private async getCollectionName(): Promise<string> {
    const [, collectionName] = this.context.args.positional;

    return collectionName;
  }

  private isPackageInstalled(name: string): boolean {
    try {
      this.rootRequire.resolve(join(name, 'package.json'));

      return true;
    } catch (e) {
      assertIsError(e);
      if (e.code !== 'MODULE_NOT_FOUND') {
        throw e;
      }
    }

    return false;
  }

  private async executeSchematic(
    options: Options<AddCommandArgs> & OtherOptions,
  ): Promise<number | void> {
    try {
      const {
        verbose,
        skipConfirmation,
        interactive,
        force,
        dryRun,
        registry,
        defaults,
        collection: collectionName,
        ...schematicOptions
      } = options;

      return await this.runSchematic({
        schematicOptions,
        schematicName: this.schematicName,
        collectionName,
        executionOptions: {
          interactive,
          force,
          dryRun,
          defaults,
          packageRegistry: registry,
        },
      });
    } catch (e) {
      if (e instanceof NodePackageDoesNotSupportSchematics) {
        this.context.logger.error(tags.oneLine`
          The package that you are trying to add does not support schematics. You can try using
          a different version of the package or contact the package author to add ng-add support.
        `);

        return 1;
      }

      throw e;
    }
  }

  private async findProjectVersion(name: string): Promise<string | null> {
    const { logger, root } = this.context;
    let installedPackage;
    try {
      installedPackage = this.rootRequire.resolve(join(name, 'package.json'));
    } catch {}

    if (installedPackage) {
      try {
        const installed = await fetchPackageManifest(dirname(installedPackage), logger);

        return installed.version;
      } catch {}
    }

    let projectManifest;
    try {
      projectManifest = await fetchPackageManifest(root, logger);
    } catch {}

    if (projectManifest) {
      const version =
        projectManifest.dependencies?.[name] || projectManifest.devDependencies?.[name];
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
        this.context.logger.warn(`Invalid peer dependency ${peer} found in package.`);
        continue;
      }

      if (peerIdentifier.type === 'version' || peerIdentifier.type === 'range') {
        try {
          const version = await this.findProjectVersion(peer);
          if (!version) {
            continue;
          }

          const options = { includePrerelease: true };

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
