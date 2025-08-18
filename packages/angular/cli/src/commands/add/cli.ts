/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { NodePackageDoesNotSupportSchematics } from '@angular-devkit/schematics/tools';
import { Listr, ListrRenderer, ListrTaskWrapper, color, figures } from 'listr2';
import assert from 'node:assert';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import npa from 'npm-package-arg';
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
import { assertIsError } from '../../utilities/error';
import {
  NgAddSaveDependency,
  PackageManifest,
  fetchPackageManifest,
  fetchPackageMetadata,
} from '../../utilities/package-metadata';
import { isTTY } from '../../utilities/tty';
import { VERSION } from '../../utilities/version';

class CommandError extends Error {}

interface AddCommandArgs extends SchematicsCommandArgs {
  collection: string;
  verbose?: boolean;
  registry?: string;
  'skip-confirmation'?: boolean;
}

interface AddCommandTaskContext {
  packageIdentifier: npa.Result;
  usingYarn?: boolean;
  savePackage?: NgAddSaveDependency;
  collectionName?: string;
  executeSchematic: AddCommandModule['executeSchematic'];
  getPeerDependencyConflicts: AddCommandModule['getPeerDependencyConflicts'];
  dryRun?: boolean;
}

type AddCommandTaskWrapper = ListrTaskWrapper<
  AddCommandTaskContext,
  typeof ListrRenderer,
  typeof ListrRenderer
>;

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

const DEFAULT_CONFLICT_DISPLAY_LIMIT = 5;

export default class AddCommandModule
  extends SchematicsCommandModule
  implements CommandModuleImplementation<AddCommandArgs>
{
  command = 'add <collection>';
  describe = 'Adds support for an external library to your project.';
  longDescriptionPath = join(__dirname, 'long-description.md');
  protected override allowPrivateSchematics = true;
  private readonly schematicName = 'ng-add';
  private rootRequire = createRequire(this.context.root + '/');
  #projectVersionCache = new Map<string, string | null>();

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

    const collectionName = this.getCollectionName();
    if (!collectionName) {
      return localYargs;
    }

    const workflow = this.getOrCreateWorkflowForBuilder(collectionName);

    try {
      const collection = workflow.engine.createCollection(collectionName);
      const options = await this.getSchematicOptions(collection, this.schematicName, workflow);

      return this.addSchemaOptionsToCommand(localYargs, options);
    } catch (error) {
      // During `ng add` prior to the downloading of the package
      // we are not able to resolve and create a collection.
      // Or when the collection value is a path to a tarball.
    }

    return localYargs;
  }

  async run(options: Options<AddCommandArgs> & OtherOptions): Promise<number | void> {
    this.#projectVersionCache.clear();
    const { logger } = this.context;
    const { collection, skipConfirmation } = options;

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

    const taskContext: AddCommandTaskContext = {
      packageIdentifier,
      executeSchematic: this.executeSchematic.bind(this),
      getPeerDependencyConflicts: this.getPeerDependencyConflicts.bind(this),
      dryRun: options.dryRun,
    };

    const tasks = new Listr<AddCommandTaskContext>(
      [
        {
          title: 'Determining Package Manager',
          task: (context, task) => this.determinePackageManagerTask(context, task),
          rendererOptions: { persistentOutput: true },
        },
        {
          title: 'Searching for compatible package version',
          enabled: packageIdentifier.type === 'range' && packageIdentifier.rawSpec === '*',
          task: (context, task) => this.findCompatiblePackageVersionTask(context, task, options),
          rendererOptions: { persistentOutput: true },
        },
        {
          title: 'Loading package information from registry',
          task: (context, task) => this.loadPackageInfoTask(context, task, options),
          rendererOptions: { persistentOutput: true },
        },
        {
          title: 'Confirming installation',
          enabled: !skipConfirmation && !options.dryRun,
          task: (context, task) => this.confirmInstallationTask(context, task),
          rendererOptions: { persistentOutput: true },
        },
        {
          title: 'Installing package',
          skip: (context) => {
            if (context.dryRun) {
              return `Skipping package installation. Would install package ${color.blue(
                context.packageIdentifier.toString(),
              )}.`;
            }

            return false;
          },
          task: (context, task) => this.installPackageTask(context, task, options),
          rendererOptions: { bottomBar: Infinity },
        },
        // TODO: Rework schematic execution as a task and insert here
      ],
      {
        /* options */
      },
    );

    try {
      const result = await tasks.run(taskContext);
      assert(result.collectionName, 'Collection name should always be available');

      if (options.dryRun) {
        logger.info('The package schematic would be executed next.');

        return;
      }

      return this.executeSchematic({ ...options, collection: result.collectionName });
    } catch (e) {
      if (e instanceof CommandError) {
        logger.error(e.message);

        return 1;
      }

      throw e;
    }
  }

  private determinePackageManagerTask(
    context: AddCommandTaskContext,
    task: AddCommandTaskWrapper,
  ): void {
    const { packageManager } = this.context;
    context.usingYarn = packageManager.name === PackageManager.Yarn;
    task.output = `Using package manager: ${color.dim(packageManager.name)}`;
  }

  private async findCompatiblePackageVersionTask(
    context: AddCommandTaskContext,
    task: AddCommandTaskWrapper,
    options: Options<AddCommandArgs>,
  ): Promise<void> {
    const { logger } = this.context;
    const { verbose, registry } = options;

    assert(
      context.packageIdentifier.name,
      'Registry package identifiers should always have a name.',
    );

    // only package name provided; search for viable version
    // plus special cases for packages that did not have peer deps setup
    let packageMetadata;
    try {
      packageMetadata = await fetchPackageMetadata(context.packageIdentifier.name, logger, {
        registry,
        usingYarn: context.usingYarn,
        verbose,
      });
    } catch (e) {
      assertIsError(e);
      throw new CommandError(`Unable to load package information from registry: ${e.message}`);
    }

    const rejectionReasons: string[] = [];

    // Start with the version tagged as `latest` if it exists
    const latestManifest = packageMetadata.tags['latest'];
    if (latestManifest) {
      const latestConflicts = await this.getPeerDependencyConflicts(latestManifest);
      if (latestConflicts) {
        // 'latest' is invalid so search for most recent matching package
        rejectionReasons.push(...latestConflicts);
      } else {
        context.packageIdentifier = npa.resolve(latestManifest.name, latestManifest.version);
        task.output = `Found compatible package version: ${color.blue(latestManifest.version)}.`;

        return;
      }
    }

    // Allow prelease versions if the CLI itself is a prerelease
    const allowPrereleases = prerelease(VERSION.full);

    const versionExclusions = packageVersionExclusions[packageMetadata.name];
    const versionManifests = Object.values(packageMetadata.versions).filter(
      (value: PackageManifest) => {
        // Already checked the 'latest' version
        if (latestManifest.version === value.version) {
          return false;
        }
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

    let found = false;
    for (const versionManifest of versionManifests) {
      const conflicts = await this.getPeerDependencyConflicts(versionManifest);
      if (conflicts) {
        if (options.verbose || rejectionReasons.length < DEFAULT_CONFLICT_DISPLAY_LIMIT) {
          rejectionReasons.push(...conflicts);
        }
        continue;
      }

      context.packageIdentifier = npa.resolve(versionManifest.name, versionManifest.version);
      found = true;
      break;
    }

    if (!found) {
      let message = `Unable to find compatible package. Using 'latest' tag.`;
      if (rejectionReasons.length > 0) {
        message +=
          '\nThis is often because of incompatible peer dependencies.\n' +
          'These versions were rejected due to the following conflicts:\n' +
          rejectionReasons
            .slice(0, options.verbose ? undefined : DEFAULT_CONFLICT_DISPLAY_LIMIT)
            .map((r) => `  - ${r}`)
            .join('\n');
      }
      task.output = message;
    } else {
      task.output = `Found compatible package version: ${color.blue(
        context.packageIdentifier.toString(),
      )}.`;
    }
  }

  private async loadPackageInfoTask(
    context: AddCommandTaskContext,
    task: AddCommandTaskWrapper,
    options: Options<AddCommandArgs>,
  ): Promise<void> {
    const { logger } = this.context;
    const { verbose, registry } = options;

    let manifest;
    try {
      manifest = await fetchPackageManifest(context.packageIdentifier.toString(), logger, {
        registry,
        verbose,
        usingYarn: context.usingYarn,
      });
    } catch (e) {
      assertIsError(e);
      throw new CommandError(
        `Unable to fetch package information for '${context.packageIdentifier}': ${e.message}`,
      );
    }

    context.savePackage = manifest['ng-add']?.save;
    context.collectionName = manifest.name;

    if (await this.getPeerDependencyConflicts(manifest)) {
      task.output = color.yellow(
        figures.warning +
          ' Package has unmet peer dependencies. Adding the package may not succeed.',
      );
    }
  }

  private async confirmInstallationTask(
    context: AddCommandTaskContext,
    task: AddCommandTaskWrapper,
  ): Promise<void> {
    if (!isTTY()) {
      task.output =
        `'--skip-confirmation' can be used to bypass installation confirmation. ` +
        `Ensure package name is correct prior to '--skip-confirmation' option usage.`;
      throw new CommandError('No terminal detected');
    }

    const { ListrInquirerPromptAdapter } = await import('@listr2/prompt-adapter-inquirer');
    const { confirm } = await import('@inquirer/prompts');
    const shouldProceed = await task.prompt(ListrInquirerPromptAdapter).run(confirm, {
      message:
        `The package ${color.blue(context.packageIdentifier.toString())} will be installed and executed.\n` +
        'Would you like to proceed?',
      default: true,
      theme: { prefix: '' },
    });

    if (!shouldProceed) {
      throw new CommandError('Command aborted');
    }
  }

  private async installPackageTask(
    context: AddCommandTaskContext,
    task: AddCommandTaskWrapper,
    options: Options<AddCommandArgs>,
  ): Promise<void> {
    const { packageManager } = this.context;
    const { registry } = options;

    // Only show if installation will actually occur
    task.title = 'Installing package';

    if (context.savePackage === false) {
      task.title += ' in temporary location';

      // Temporary packages are located in a different directory
      // Hence we need to resolve them using the temp path
      const { success, tempNodeModules } = await packageManager.installTemp(
        context.packageIdentifier.toString(),
        registry ? [`--registry="${registry}"`] : undefined,
      );
      const tempRequire = createRequire(tempNodeModules + '/');
      assert(context.collectionName, 'Collection name should always be available');
      const resolvedCollectionPath = tempRequire.resolve(
        join(context.collectionName, 'package.json'),
      );

      if (!success) {
        throw new CommandError('Unable to install package');
      }

      context.collectionName = dirname(resolvedCollectionPath);
    } else {
      const success = await packageManager.install(
        context.packageIdentifier.toString(),
        context.savePackage,
        registry ? [`--registry="${registry}"`] : undefined,
        undefined,
      );

      if (!success) {
        throw new CommandError('Unable to install package');
      }
    }
  }

  private async isProjectVersionValid(packageIdentifier: npa.Result): Promise<boolean> {
    if (!packageIdentifier.name) {
      return false;
    }

    const installedVersion = await this.findProjectVersion(packageIdentifier.name);
    if (!installedVersion) {
      return false;
    }

    if (packageIdentifier.rawSpec === '*') {
      return true;
    }

    if (
      packageIdentifier.type === 'range' &&
      packageIdentifier.fetchSpec &&
      packageIdentifier.fetchSpec !== '*'
    ) {
      return satisfies(installedVersion, packageIdentifier.fetchSpec);
    }

    if (packageIdentifier.type === 'version') {
      const v1 = valid(packageIdentifier.fetchSpec);
      const v2 = valid(installedVersion);

      return v1 !== null && v1 === v2;
    }

    return false;
  }

  private getCollectionName(): string | undefined {
    const [, collectionName] = this.context.args.positional;
    if (!collectionName) {
      return undefined;
    }

    // The CLI argument may specify also a version, like `ng add @my/lib@13.0.0`,
    // but here we need only the name of the package, like `@my/lib`.
    try {
      const packageName = npa(collectionName).name;
      if (packageName) {
        return packageName;
      }
    } catch (e) {
      assertIsError(e);
      this.context.logger.error(e.message);
    }

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
        this.context.logger.error(
          'The package that you are trying to add does not support schematics.' +
            'You can try using a different version of the package or contact the package author to add ng-add support.',
        );

        return 1;
      }

      throw e;
    }
  }

  private async findProjectVersion(name: string): Promise<string | null> {
    const cachedVersion = this.#projectVersionCache.get(name);
    if (cachedVersion !== undefined) {
      return cachedVersion;
    }

    const { logger, root } = this.context;
    let installedPackage;
    try {
      installedPackage = this.rootRequire.resolve(join(name, 'package.json'));
    } catch {}

    if (installedPackage) {
      try {
        const installed = await fetchPackageManifest(dirname(installedPackage), logger);
        this.#projectVersionCache.set(name, installed.version);

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
        this.#projectVersionCache.set(name, version);

        return version;
      }
    }

    this.#projectVersionCache.set(name, null);

    return null;
  }

  private async getPeerDependencyConflicts(manifest: PackageManifest): Promise<string[] | false> {
    const conflicts: string[] = [];
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
            conflicts.push(
              `Package "${manifest.name}@${manifest.version}" has an incompatible peer dependency to "` +
                `${peer}@${peerIdentifier.rawSpec}" (requires "${version}" in project).`,
            );
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

    return conflicts.length > 0 && conflicts;
  }
}
