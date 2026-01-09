/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Listr, ListrRenderer, ListrTaskWrapper, color, figures } from 'listr2';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import npa from 'npm-package-arg';
import semver, { Range, compare, intersects, prerelease, satisfies, valid } from 'semver';
import { Argv } from 'yargs';
import {
  CommandModuleImplementation,
  Options,
  OtherOptions,
} from '../../command-builder/command-module';
import {
  SchematicsCommandArgs,
  SchematicsCommandModule,
} from '../../command-builder/schematics-command-module';
import {
  NgAddSaveDependency,
  PackageManager,
  PackageManagerError,
  PackageManifest,
  PackageMetadata,
  createPackageManager,
} from '../../package-managers';
import { assertIsError } from '../../utilities/error';
import { isTTY } from '../../utilities/tty';
import { VERSION } from '../../utilities/version';
import { getCacheConfig } from '../cache/utilities';

class CommandError extends Error {}

interface AddCommandArgs extends SchematicsCommandArgs {
  collection: string;
  verbose?: boolean;
  registry?: string;
  'skip-confirmation'?: boolean;
}

interface AddCommandTaskContext {
  packageManager: PackageManager;
  packageIdentifier: npa.Result;
  savePackage?: NgAddSaveDependency;
  collectionName?: string;
  executeSchematic: AddCommandModule['executeSchematic'];
  getPeerDependencyConflicts: AddCommandModule['getPeerDependencyConflicts'];
  dryRun?: boolean;
  hasSchematics?: boolean;
  homepage?: string;
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

/**
 * A map of packages to built-in schematics.
 * This is used for packages that do not have a native `ng-add` schematic.
 */
const BUILT_IN_SCHEMATICS = {
  tailwindcss: {
    collection: '@schematics/angular',
    name: 'tailwind',
  },
  '@vitest/browser-playwright': {
    collection: '@schematics/angular',
    name: 'vitest-browser',
  },
  '@vitest/browser-webdriverio': {
    collection: '@schematics/angular',
    name: 'vitest-browser',
  },
  '@vitest/browser-preview': {
    collection: '@schematics/angular',
    name: 'vitest-browser',
  },
} as const;

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

    const taskContext = {
      packageIdentifier,
      executeSchematic: this.executeSchematic.bind(this),
      getPeerDependencyConflicts: this.getPeerDependencyConflicts.bind(this),
      dryRun: options.dryRun,
    } as AddCommandTaskContext;

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
          title: 'Loading package information',
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

      // Check if the installed package has actual add actions and not just schematic support
      if (result.hasSchematics && !options.dryRun) {
        const workflow = this.getOrCreateWorkflowForBuilder(result.collectionName);
        const collection = workflow.engine.createCollection(result.collectionName);

        // listSchematicNames cannot be used here since it does not list private schematics.
        // Most `ng-add` schematics are marked as private.
        // TODO: Consider adding a `hasSchematic` helper to the schematic collection object.
        try {
          collection.createSchematic(this.schematicName, true);
        } catch {
          result.hasSchematics = false;
        }
      }

      if (!result.hasSchematics) {
        // Fallback to a built-in schematic if the package does not have an `ng-add` schematic
        const packageName = result.packageIdentifier.name;
        if (packageName) {
          const builtInSchematic =
            BUILT_IN_SCHEMATICS[packageName as keyof typeof BUILT_IN_SCHEMATICS];
          if (builtInSchematic) {
            logger.info(
              `The ${color.blue(packageName)} package does not provide \`ng add\` actions.`,
            );
            logger.info('The Angular CLI will use built-in actions to add it to your project.');

            return this.executeSchematic({
              ...options,
              collection: builtInSchematic.collection,
              schematicName: builtInSchematic.name,
              package: packageName,
            });
          }
        }

        let message = options.dryRun
          ? 'The package does not provide any `ng add` actions, so no further actions would be taken.'
          : 'Package installed successfully. The package does not provide any `ng add` actions, so no further actions were taken.';

        if (result.homepage) {
          message += `\nFor more information about this package, visit its homepage at ${result.homepage}`;
        }
        logger.info(message);

        return;
      }

      if (options.dryRun) {
        logger.info("The package's `ng add` actions would be executed next.");

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

  private async determinePackageManagerTask(
    context: AddCommandTaskContext,
    task: AddCommandTaskWrapper,
  ): Promise<void> {
    let tempDirectory: string | undefined;
    const tempOptions = ['node_modules'];

    const cacheConfig = getCacheConfig(this.context.workspace);
    if (cacheConfig.enabled) {
      const cachePath = resolve(this.context.root, cacheConfig.path);
      if (!relative(this.context.root, cachePath).startsWith('..')) {
        tempOptions.push(cachePath);
      }
    }

    for (const tempOption of tempOptions) {
      try {
        const directory = resolve(this.context.root, tempOption);
        if ((await fs.stat(directory)).isDirectory()) {
          tempDirectory = directory;
          break;
        }
      } catch {}
    }

    context.packageManager = await createPackageManager({
      cwd: this.context.root,
      logger: this.context.logger,
      dryRun: context.dryRun,
      tempDirectory,
    });
    task.output = `Using package manager: ${color.dim(context.packageManager.name)}`;
  }

  private async findCompatiblePackageVersionTask(
    context: AddCommandTaskContext,
    task: AddCommandTaskWrapper,
    options: Options<AddCommandArgs>,
  ): Promise<void> {
    const { registry, verbose } = options;
    const { packageManager, packageIdentifier } = context;
    const packageName = packageIdentifier.name;

    assert(packageName, 'Registry package identifiers should always have a name.');

    const rejectionReasons: string[] = [];

    // Attempt to use the 'latest' tag from the registry.
    try {
      const latestManifest = await packageManager.getManifest(`${packageName}@latest`, {
        registry,
      });

      if (latestManifest) {
        const conflicts = await this.getPeerDependencyConflicts(latestManifest);
        if (!conflicts) {
          context.packageIdentifier = npa.resolve(latestManifest.name, latestManifest.version);
          task.output = `Found compatible package version: ${color.blue(latestManifest.version)}.`;

          return;
        }
        rejectionReasons.push(...conflicts);
      }
    } catch (e) {
      assertIsError(e);
      throw new CommandError(`Unable to load package information from registry: ${e.message}`);
    }

    // 'latest' is invalid or not found, search for most recent matching package.
    task.output =
      'Could not find a compatible version with `latest`. Searching for a compatible version.';

    let packageMetadata;
    try {
      packageMetadata = await packageManager.getRegistryMetadata(packageName, {
        registry,
      });
    } catch (e) {
      assertIsError(e);
      throw new CommandError(`Unable to load package information from registry: ${e.message}`);
    }

    if (!packageMetadata) {
      throw new CommandError('Unable to load package information from registry.');
    }

    // Allow prelease versions if the CLI itself is a prerelease or locally built.
    const allowPrereleases = !!prerelease(VERSION.full) || VERSION.full === '0.0.0';
    const potentialVersions = this.#getPotentialVersions(packageMetadata, allowPrereleases);

    // Heuristic-based search: Check the latest release of each major version first.
    const majorVersions = this.#getMajorVersions(potentialVersions);
    let found = await this.#findCompatibleVersion(context, majorVersions, {
      registry,
      verbose,
      rejectionReasons,
    });

    // Exhaustive search: If no compatible major version is found, fall back to checking all versions.
    if (!found) {
      const checkedVersions = new Set(majorVersions);
      const remainingVersions = potentialVersions.filter((v) => !checkedVersions.has(v));
      found = await this.#findCompatibleVersion(context, remainingVersions, {
        registry,
        verbose,
        rejectionReasons,
      });
    }

    if (!found) {
      let message = `Unable to find compatible package.`;
      if (rejectionReasons.length > 0) {
        message +=
          '\nThis is often because of incompatible peer dependencies.\n' +
          'These versions were rejected due to the following conflicts:\n' +
          rejectionReasons
            .slice(0, verbose ? undefined : DEFAULT_CONFLICT_DISPLAY_LIMIT)
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

  async #findCompatibleVersion(
    context: AddCommandTaskContext,
    versions: string[],
    options: {
      registry?: string;
      verbose?: boolean;
      rejectionReasons: string[];
    },
  ): Promise<PackageManifest | null> {
    const { packageManager, packageIdentifier } = context;
    const { registry, verbose, rejectionReasons } = options;
    const packageName = packageIdentifier.name;
    assert(packageName, 'Package name must be defined.');

    for (const version of versions) {
      const manifest = await packageManager.getManifest(`${packageName}@${version}`, {
        registry,
      });
      if (!manifest) {
        continue;
      }

      const conflicts = await this.getPeerDependencyConflicts(manifest);
      if (conflicts) {
        if (verbose || rejectionReasons.length < DEFAULT_CONFLICT_DISPLAY_LIMIT) {
          rejectionReasons.push(...conflicts);
        }
        continue;
      }

      context.packageIdentifier = npa.resolve(manifest.name, manifest.version);

      return manifest;
    }

    return null;
  }

  #getPotentialVersions(packageMetadata: PackageMetadata, allowPrereleases: boolean): string[] {
    const versionExclusions = packageVersionExclusions[packageMetadata.name];
    const latestVersion = packageMetadata['dist-tags']['latest'];

    const versions = Object.values(packageMetadata.versions).filter((version) => {
      // Latest tag has already been checked
      if (latestVersion && version === latestVersion) {
        return false;
      }

      // Prerelease versions are not stable and should not be considered by default
      if (!allowPrereleases && prerelease(version)) {
        return false;
      }

      // Excluded package versions should not be considered
      if (versionExclusions && satisfies(version, versionExclusions, { includePrerelease: true })) {
        return false;
      }

      return true;
    });

    // Sort in reverse SemVer order so that the newest compatible version is chosen
    return versions.sort((a, b) => compare(b, a, true));
  }

  #getMajorVersions(versions: string[]): string[] {
    const majorVersions = new Map<number, string>();
    for (const version of versions) {
      const major = semver.major(version);
      const existing = majorVersions.get(major);
      if (!existing || semver.gt(version, existing)) {
        majorVersions.set(major, version);
      }
    }

    return [...majorVersions.values()].sort((a, b) => compare(b, a, true));
  }

  private async loadPackageInfoTask(
    context: AddCommandTaskContext,
    task: AddCommandTaskWrapper,
    options: Options<AddCommandArgs>,
  ): Promise<void> {
    const { registry } = options;

    let manifest;
    try {
      manifest = await context.packageManager.getManifest(context.packageIdentifier.toString(), {
        registry,
      });
    } catch (e) {
      assertIsError(e);
      throw new CommandError(
        `Unable to fetch package information for '${context.packageIdentifier}': ${e.message}`,
      );
    }

    if (!manifest) {
      throw new CommandError(
        `Unable to fetch package information for '${context.packageIdentifier}'.`,
      );
    }

    context.hasSchematics = !!manifest.schematics;
    context.savePackage = manifest['ng-add']?.save;
    context.collectionName = manifest.name;
    context.homepage = manifest.homepage;

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
    const { registry } = options;
    const { packageManager, packageIdentifier, savePackage } = context;

    // Only show if installation will actually occur
    task.title = 'Installing package';

    try {
      if (context.savePackage === false) {
        task.title += ' in temporary location';

        // Temporary packages are located in a different directory
        // Hence we need to resolve them using the temp path
        const { workingDirectory } = await packageManager.acquireTempPackage(
          packageIdentifier.toString(),
          {
            registry,
          },
        );

        const tempRequire = createRequire(workingDirectory + '/');
        assert(context.collectionName, 'Collection name should always be available');
        const resolvedCollectionPath = tempRequire.resolve(
          join(context.collectionName, 'package.json'),
        );

        context.collectionName = dirname(resolvedCollectionPath);
      } else {
        await packageManager.add(
          packageIdentifier.toString(),
          'none',
          savePackage !== 'dependencies',
          false,
          true,
          {
            registry,
          },
        );
      }
    } catch (e) {
      if (e instanceof PackageManagerError) {
        const output = e.stderr || e.stdout;
        if (output) {
          throw new CommandError(`Package installation failed: ${e.message}\nOutput: ${output}`);
        }
      }

      throw e;
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

  private executeSchematic(
    options: Options<AddCommandArgs> & OtherOptions & { schematicName?: string },
  ): Promise<number | void> {
    const {
      verbose,
      skipConfirmation,
      interactive,
      force,
      dryRun,
      registry,
      defaults,
      collection: collectionName,
      schematicName,
      ...schematicOptions
    } = options;

    return this.runSchematic({
      schematicOptions,
      schematicName: schematicName ?? this.schematicName,
      collectionName,
      executionOptions: {
        interactive,
        force,
        dryRun,
        defaults,
        packageRegistry: registry,
      },
    });
  }

  private async findProjectVersion(name: string): Promise<string | null> {
    const cachedVersion = this.#projectVersionCache.get(name);
    if (cachedVersion !== undefined) {
      return cachedVersion;
    }

    const { root } = this.context;
    let installedPackagePath;
    try {
      installedPackagePath = this.rootRequire.resolve(join(name, 'package.json'));
    } catch {}

    if (installedPackagePath) {
      try {
        const installedPackage = JSON.parse(
          await fs.readFile(installedPackagePath, 'utf-8'),
        ) as PackageManifest;
        this.#projectVersionCache.set(name, installedPackage.version);

        return installedPackage.version;
      } catch {}
    }

    let projectManifest;
    try {
      projectManifest = JSON.parse(
        await fs.readFile(join(root, 'package.json'), 'utf-8'),
      ) as PackageManifest;
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
    if (!manifest.peerDependencies) {
      return false;
    }

    const checks = Object.entries(manifest.peerDependencies).map(async ([peer, range]) => {
      let peerIdentifier;
      try {
        peerIdentifier = npa.resolve(peer, range);
      } catch {
        this.context.logger.warn(`Invalid peer dependency ${peer} found in package.`);

        return null;
      }

      if (peerIdentifier.type !== 'version' && peerIdentifier.type !== 'range') {
        // type === 'tag' | 'file' | 'directory' | 'remote' | 'git'
        // Cannot accurately compare these as the tag/location may have changed since install.
        return null;
      }

      try {
        const version = await this.findProjectVersion(peer);
        if (!version) {
          return null;
        }

        const options = { includePrerelease: true };
        if (
          !intersects(version, peerIdentifier.rawSpec, options) &&
          !satisfies(version, peerIdentifier.rawSpec, options)
        ) {
          return (
            `Package "${manifest.name}@${manifest.version}" has an incompatible peer dependency to "` +
            `${peer}@${peerIdentifier.rawSpec}" (requires "${version}" in project).`
          );
        }
      } catch {
        // Not found or invalid so ignore
      }

      return null;
    });

    const conflicts = (await Promise.all(checks)).filter((result): result is string => !!result);

    return conflicts.length > 0 && conflicts;
  }
}
