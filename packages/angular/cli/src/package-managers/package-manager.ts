/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * @fileoverview This file contains the `PackageManager` class, which is the
 * core execution engine for all package manager commands. It is designed to be
 * a flexible and secure abstraction over the various package managers.
 */

import { join } from 'node:path';
import npa from 'npm-package-arg';
import { maxSatisfying } from 'semver';
import { PackageManagerError } from './error';
import { Host } from './host';
import { Logger } from './logger';
import { PackageManagerDescriptor } from './package-manager-descriptor';
import { PackageManifest, PackageMetadata } from './package-metadata';
import { InstalledPackage } from './package-tree';

/**
 * The fields to request from the registry for package metadata.
 * This is a performance optimization to avoid downloading the full manifest
 * when only summary data (like versions and tags) is needed.
 */
const METADATA_FIELDS = ['name', 'dist-tags', 'versions', 'time'] as const;

/**
 * The fields to request from the registry for a package's manifest.
 * This is a performance optimization to avoid downloading unnecessary data.
 * These fields are the ones required by the CLI for operations like `ng add` and `ng update`.
 */
const MANIFEST_FIELDS = [
  'name',
  'version',
  'deprecated',
  'dependencies',
  'peerDependencies',
  'devDependencies',
  'homepage',
  'schematics',
  'ng-add',
  'ng-update',
] as const;

/**
 * Options to configure the `PackageManager` instance.
 */
export interface PackageManagerOptions {
  /**
   * If true, no commands will be executed, but they will be logged to the logger.
   * A logger must be provided if this is true.
   */
  dryRun?: boolean;

  /** A logger instance for debugging and dry run output. */
  logger?: Logger;
}

/**
 * A class that provides a high-level, package-manager-agnostic API for
 * interacting with a project's dependencies.
 *
 * This class is an implementation of the Strategy design pattern. It is
 * instantiated with a `PackageManagerDescriptor` that defines the specific
 * commands and flags for a given package manager.
 */
export class PackageManager {
  readonly #manifestCache = new Map<string, PackageManifest | null>();
  readonly #metadataCache = new Map<string, PackageMetadata | null>();
  #dependencyCache: Map<string, InstalledPackage> | null = null;

  /**
   * Creates a new `PackageManager` instance.
   * @param host A `Host` instance for interacting with the file system and running commands.
   * @param cwd The absolute path to the project's working directory.
   * @param descriptor A `PackageManagerDescriptor` that defines the commands for a specific package manager.
   * @param options An options object to configure the instance.
   */
  constructor(
    private readonly host: Host,
    private readonly cwd: string,
    private readonly descriptor: PackageManagerDescriptor,
    private readonly options: PackageManagerOptions = {},
  ) {
    if (this.options.dryRun && !this.options.logger) {
      throw new Error('A logger must be provided when dryRun is enabled.');
    }
  }

  /**
   * The name of the package manager's binary.
   */
  get name(): string {
    return this.descriptor.binary;
  }

  /**
   * A private method to lazily populate the dependency cache.
   * This is a performance optimization to avoid running `npm list` multiple times.
   * @returns A promise that resolves to the dependency cache map.
   */
  async #populateDependencyCache(): Promise<Map<string, InstalledPackage>> {
    if (this.#dependencyCache !== null) {
      return this.#dependencyCache;
    }

    const args = this.descriptor.listDependenciesCommand;

    const dependencies = await this.#fetchAndParse(args, (stdout, logger) =>
      this.descriptor.outputParsers.listDependencies(stdout, logger),
    );

    return (this.#dependencyCache = dependencies ?? new Map());
  }

  /**
   * A private method to run a command using the package manager's binary.
   * @param args The arguments to pass to the command.
   * @param options Options for the child process.
   * @returns A promise that resolves with the standard output and standard error of the command.
   */
  async #run(
    args: readonly string[],
    options: { timeout?: number; registry?: string; cwd?: string } = {},
  ): Promise<{ stdout: string; stderr: string }> {
    const { registry, cwd, ...runOptions } = options;
    const finalArgs = [...args];
    let finalEnv: Record<string, string> | undefined;

    if (registry) {
      const registryOptions = this.descriptor.getRegistryOptions?.(registry);
      if (!registryOptions) {
        throw new Error(
          `The configured package manager, '${this.descriptor.binary}', does not support a custom registry.`,
        );
      }

      if (registryOptions.args) {
        finalArgs.push(...registryOptions.args);
      }
      if (registryOptions.env) {
        finalEnv = registryOptions.env;
      }
    }

    const executionDirectory = cwd ?? this.cwd;
    if (this.options.dryRun) {
      this.options.logger?.info(
        `[DRY RUN] Would execute in [${executionDirectory}]: ${this.descriptor.binary} ${finalArgs.join(' ')}`,
      );

      return { stdout: '', stderr: '' };
    }

    const commandResult = await this.host.runCommand(this.descriptor.binary, finalArgs, {
      ...runOptions,
      cwd: executionDirectory,
      stdio: 'pipe',
      env: finalEnv,
    });

    return { stdout: commandResult.stdout.trim(), stderr: commandResult.stderr.trim() };
  }

  /**
   * A private, generic method to encapsulate the common logic of running a command,
   * handling errors, and parsing the output.
   * @param args The arguments to pass to the command.
   * @param parser A function that parses the command's stdout.
   * @param options Options for the command, including caching.
   * @returns A promise that resolves to the parsed data, or null if not found.
   */
  async #fetchAndParse<T>(
    args: readonly string[],
    parser: (stdout: string, logger?: Logger) => T | null,
    options: {
      timeout?: number;
      registry?: string;
      bypassCache?: boolean;
      cache?: Map<string, T | null>;
      cacheKey?: string;
    } = {},
  ): Promise<T | null> {
    const { cache, cacheKey, bypassCache, ...runOptions } = options;

    if (!bypassCache && cache && cacheKey && cache.has(cacheKey)) {
      return cache.get(cacheKey) as T | null;
    }

    let stdout;
    let stderr;
    let exitCode;
    let thrownError;
    try {
      ({ stdout, stderr } = await this.#run(args, runOptions));
      exitCode = 0;
    } catch (e) {
      thrownError = e;
      if (e instanceof PackageManagerError) {
        stdout = e.stdout;
        stderr = e.stderr;
        exitCode = e.exitCode;
      } else {
        // Re-throw unexpected errors
        throw e;
      }
    }

    // Yarn classic can exit with code 0 even when an error occurs.
    // To ensure we capture these cases, we will always attempt to parse a
    // structured error from the output, regardless of the exit code.
    const getError = this.descriptor.outputParsers.getError;
    const parsedError =
      getError?.(stdout, this.options.logger) ?? getError?.(stderr, this.options.logger) ?? null;

    if (parsedError) {
      this.options.logger?.debug(
        `[${this.descriptor.binary}] Structured error (code: ${parsedError.code}): ${parsedError.summary}`,
      );

      // Special case for 'not found' errors (e.g., E404). Return null for these.
      if (this.descriptor.isNotFound(parsedError)) {
        if (cache && cacheKey) {
          cache.set(cacheKey, null);
        }

        return null;
      } else {
        // For all other structured errors, throw a more informative error.
        throw new PackageManagerError(parsedError.summary, stdout, stderr, exitCode);
      }
    }

    // If an error was originally thrown and we didn't parse a more specific
    // structured error, re-throw the original error now.
    if (thrownError) {
      throw thrownError;
    }

    // If we reach this point, the command succeeded and no structured error was found.
    // We can now safely parse the successful output.
    try {
      const result = parser(stdout, this.options.logger);
      if (cache && cacheKey) {
        cache.set(cacheKey, result);
      }

      return result;
    } catch (e) {
      const message = `Failed to parse package manager output: ${
        e instanceof Error ? e.message : ''
      }`;
      throw new PackageManagerError(message, stdout, stderr, exitCode);
    }
  }

  /**
   * Adds a package to the project's dependencies.
   * @param packageName The name of the package to add.
   * @param save The save strategy to use.
   * - `exact`: The package will be saved with an exact version.
   * - `tilde`: The package will be saved with a tilde version range (`~`).
   * - `none`: The package will be saved with the default version range (`^`).
   * @param asDevDependency Whether to install the package as a dev dependency.
   * @param noLockfile Whether to skip updating the lockfile.
   * @param options Extra options for the command.
   * @returns A promise that resolves when the command is complete.
   */
  async add(
    packageName: string,
    save: 'exact' | 'tilde' | 'none',
    asDevDependency: boolean,
    noLockfile: boolean,
    ignoreScripts: boolean,
    options: { registry?: string } = {},
  ): Promise<void> {
    const flags = [
      asDevDependency ? this.descriptor.saveDevFlag : '',
      save === 'exact' ? this.descriptor.saveExactFlag : '',
      save === 'tilde' ? this.descriptor.saveTildeFlag : '',
      noLockfile ? this.descriptor.noLockfileFlag : '',
      ignoreScripts ? this.descriptor.ignoreScriptsFlag : '',
    ].filter((flag) => flag);

    const args = [this.descriptor.addCommand, packageName, ...flags];
    await this.#run(args, options);

    this.#dependencyCache = null;
  }

  /**
   * Installs all dependencies in the project.
   * @param options Options for the installation.
   * @param options.timeout The maximum time in milliseconds to wait for the command to complete.
   * @param options.force If true, forces a clean install, potentially overwriting existing modules.
   * @param options.registry The registry to use for the installation.
   * @param options.ignoreScripts If true, prevents lifecycle scripts from being executed.
   * @returns A promise that resolves when the command is complete.
   */
  async install(
    options: {
      timeout?: number;
      force?: boolean;
      registry?: string;
      ignoreScripts?: boolean;
    } = { ignoreScripts: true },
  ): Promise<void> {
    const flags = [
      options.force ? this.descriptor.forceFlag : '',
      options.ignoreScripts ? this.descriptor.ignoreScriptsFlag : '',
    ].filter((flag) => flag);
    const args = [...this.descriptor.installCommand, ...flags];

    await this.#run(args, options);

    this.#dependencyCache = null;
  }

  /**
   * Gets the version of the package manager binary.
   * @returns A promise that resolves to the trimmed version string.
   */
  async getVersion(): Promise<string> {
    const { stdout } = await this.#run(this.descriptor.versionCommand);

    return stdout.trim();
  }

  /**
   * Gets the installed details of a package from the project's dependencies.
   * @param packageName The name of the package to check.
   * @returns A promise that resolves to the installed package details, or `null` if the package is not installed.
   */
  async getInstalledPackage(packageName: string): Promise<InstalledPackage | null> {
    const cache = await this.#populateDependencyCache();

    return cache.get(packageName) ?? null;
  }

  /**
   * Gets a map of all top-level dependencies installed in the project.
   * @returns A promise that resolves to a map of package names to their installed package details.
   */
  async getProjectDependencies(): Promise<Map<string, InstalledPackage>> {
    const cache = await this.#populateDependencyCache();

    // Return a copy to prevent external mutations of the cache.
    return new Map(cache);
  }

  /**
   * Fetches the registry metadata for a package. This is the full metadata,
   * including all versions and distribution tags.
   * @param packageName The name of the package to fetch the metadata for.
   * @param options Options for the fetch.
   * @param options.timeout The maximum time in milliseconds to wait for the command to complete.
   * @param options.registry The registry to use for the fetch.
   * @param options.bypassCache If true, ignores the in-memory cache and fetches fresh data.
   * @returns A promise that resolves to the `PackageMetadata` object, or `null` if the package is not found.
   */
  async getRegistryMetadata(
    packageName: string,
    options: { timeout?: number; registry?: string; bypassCache?: boolean } = {},
  ): Promise<PackageMetadata | null> {
    const commandArgs = [...this.descriptor.getManifestCommand, packageName];
    const formatter = this.descriptor.viewCommandFieldArgFormatter;
    if (formatter) {
      commandArgs.push(...formatter(METADATA_FIELDS));
    }

    const cacheKey = options.registry ? `${packageName}|${options.registry}` : packageName;

    return this.#fetchAndParse(
      commandArgs,
      (stdout, logger) => this.descriptor.outputParsers.getRegistryMetadata(stdout, logger),
      { ...options, cache: this.#metadataCache, cacheKey },
    );
  }

  /**
   * Fetches the registry manifest for a specific version of a package.
   * The manifest is similar to the package's `package.json` file.
   * @param packageName The name of the package to fetch the manifest for.
   * @param version The version of the package to fetch the manifest for.
   * @param options Options for the fetch.
   * @param options.timeout The maximum time in milliseconds to wait for the command to complete.
   * @param options.registry The registry to use for the fetch.
   * @param options.bypassCache If true, ignores the in-memory cache and fetches fresh data.
   * @returns A promise that resolves to the `PackageManifest` object, or `null` if the package is not found.
   */
  async getRegistryManifest(
    packageName: string,
    version: string,
    options: { timeout?: number; registry?: string; bypassCache?: boolean } = {},
  ): Promise<PackageManifest | null> {
    const specifier = `${packageName}@${version}`;
    const commandArgs = [...this.descriptor.getManifestCommand, specifier];
    const formatter = this.descriptor.viewCommandFieldArgFormatter;
    if (formatter) {
      commandArgs.push(...formatter(MANIFEST_FIELDS));
    }

    const cacheKey = options.registry ? `${specifier}|${options.registry}` : specifier;

    const manifest = await this.#fetchAndParse(
      commandArgs,
      (stdout, logger) => this.descriptor.outputParsers.getRegistryManifest(stdout, logger),
      { ...options, cache: this.#manifestCache, cacheKey },
    );

    // If the provided version was not a specific version, also cache the specific fetched version
    if (manifest && manifest.version !== version) {
      const manifestSpecifier = `${manifest.name}@${manifest.version}`;
      const manifestCacheKey = options.registry
        ? `${manifestSpecifier}|${options.registry}`
        : manifestSpecifier;
      this.#manifestCache.set(manifestCacheKey, manifest);
    }

    return manifest;
  }

  /**
   * Fetches the manifest for a package.
   *
   * This method can resolve manifests for packages from the registry, as well
   * as those specified by file paths, directory paths, and remote tarballs.
   * Caching is only supported for registry packages.
   *
   * @param specifier The package specifier to resolve the manifest for.
   * @param options Options for the fetch.
   * @returns A promise that resolves to the `PackageManifest` object, or `null` if the package is not found.
   */
  async getManifest(
    specifier: string | npa.Result,
    options: { timeout?: number; registry?: string; bypassCache?: boolean } = {},
  ): Promise<PackageManifest | null> {
    const { name, type, fetchSpec } = typeof specifier === 'string' ? npa(specifier) : specifier;

    switch (type) {
      case 'range':
      case 'version':
      case 'tag': {
        if (!name) {
          throw new Error(`Could not parse package name from specifier: ${specifier}`);
        }

        // `fetchSpec` is the version, range, or tag.
        let versionSpec = fetchSpec ?? 'latest';
        if (this.descriptor.requiresManifestVersionLookup) {
          if (type === 'tag' || !fetchSpec) {
            const metadata = await this.getRegistryMetadata(name, options);
            if (!metadata) {
              return null;
            }
            versionSpec = metadata['dist-tags'][versionSpec];
          } else if (type === 'range') {
            const metadata = await this.getRegistryMetadata(name, options);
            if (!metadata) {
              return null;
            }
            versionSpec = maxSatisfying(metadata.versions, fetchSpec) ?? '';
          }
          if (!versionSpec) {
            return null;
          }
        }

        return this.getRegistryManifest(name, versionSpec, options);
      }
      case 'directory': {
        if (!fetchSpec) {
          throw new Error(`Could not parse directory path from specifier: ${specifier}`);
        }

        const manifestPath = join(fetchSpec, 'package.json');
        const manifest = await this.host.readFile(manifestPath);

        return JSON.parse(manifest);
      }
      case 'file':
      case 'remote':
      case 'git': {
        if (!fetchSpec) {
          throw new Error(`Could not parse location from specifier: ${specifier}`);
        }

        // Caching is not supported for non-registry specifiers.
        const { workingDirectory, cleanup } = await this.acquireTempPackage(fetchSpec, {
          ...options,
          ignoreScripts: true,
        });

        try {
          // Discover the package name by reading the temporary `package.json` file.
          // The package manager will have added the package to the `dependencies`.
          const tempManifest = await this.host.readFile(join(workingDirectory, 'package.json'));
          const { dependencies } = JSON.parse(tempManifest) as PackageManifest;
          const packageName = dependencies && Object.keys(dependencies)[0];

          if (!packageName) {
            throw new Error(`Could not determine package name for specifier: ${specifier}`);
          }

          // The package will be installed in `<temp>/node_modules/<name>`.
          const packagePath = join(workingDirectory, 'node_modules', packageName);
          const manifestPath = join(packagePath, 'package.json');
          const manifest = await this.host.readFile(manifestPath);

          return JSON.parse(manifest);
        } finally {
          await cleanup();
        }
      }
      default:
        throw new Error(`Unsupported package specifier type: ${type}`);
    }
  }

  /**
   * Acquires a package by installing it into a temporary directory. The caller is
   * responsible for managing the lifecycle of the temporary directory by calling
   * the returned `cleanup` function.
   *
   * @param specifier The specifier of the package to install.
   * @param options Options for the installation.
   * @returns A promise that resolves to an object containing the temporary path
   *   and a cleanup function.
   */
  async acquireTempPackage(
    specifier: string,
    options: { registry?: string; ignoreScripts?: boolean } = {},
  ): Promise<{ workingDirectory: string; cleanup: () => Promise<void> }> {
    const workingDirectory = await this.host.createTempDirectory();
    const cleanup = () => this.host.deleteDirectory(workingDirectory);

    // Some package managers, like yarn classic, do not write a package.json when adding a package.
    // This can cause issues with subsequent `require.resolve` calls.
    // Writing an empty package.json file beforehand prevents this.
    await this.host.writeFile(join(workingDirectory, 'package.json'), '{}');

    const flags = [options.ignoreScripts ? this.descriptor.ignoreScriptsFlag : ''].filter(
      (flag) => flag,
    );
    const args: readonly string[] = [this.descriptor.addCommand, specifier, ...flags];

    try {
      await this.#run(args, { ...options, cwd: workingDirectory });
    } catch (e) {
      // If the command fails, clean up the temporary directory immediately.
      await cleanup();
      throw e;
    }

    return { workingDirectory, cleanup };
  }
}
