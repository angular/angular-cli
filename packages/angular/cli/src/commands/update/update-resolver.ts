/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { logging } from '@angular-devkit/core';
import { existsSync, promises as fs, readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import npa from 'npm-package-arg';
import * as semver from 'semver';
import type { PackageManager, PackageManifest, PackageMetadata } from '../../package-managers';

export type VersionRange = string & { __VERSION_RANGE: void };
type PeerVersionTransform = string | ((range: string) => string);

export class RegistryClient {
  private metadataCache = new Map<string, Promise<PackageMetadata | null>>();
  private manifestCache = new Map<string, Promise<PackageManifest | null>>();

  constructor(
    private packageManager: PackageManager,
    private logger: logging.LoggerApi,
    readonly minReleaseAge: number = 0,
    private getRegistryName?: (name: string) => string,
  ) {}

  async getMetadata(packageName: string): Promise<PackageMetadata | null> {
    const registryName = this.getRegistryName ? this.getRegistryName(packageName) : packageName;
    let promise = this.metadataCache.get(registryName);
    if (!promise) {
      promise = this.packageManager.getRegistryMetadata(registryName).catch((e) => {
        this.metadataCache.delete(registryName);
        throw e;
      });
      this.metadataCache.set(registryName, promise);
    }

    const metadata = await promise;
    if (metadata && registryName !== packageName) {
      return { ...metadata, name: packageName };
    }

    return metadata;
  }

  async getManifest(packageName: string, version: string): Promise<PackageManifest | null> {
    const registryName = this.getRegistryName ? this.getRegistryName(packageName) : packageName;
    const key = `${registryName}@${version}`;
    let promise = this.manifestCache.get(key);
    if (!promise) {
      promise = this.packageManager.getRegistryManifest(registryName, version).catch((e) => {
        this.manifestCache.delete(key);
        throw e;
      });
      this.manifestCache.set(key, promise);
    }

    const manifest = await promise;
    if (manifest && registryName !== packageName) {
      return { ...manifest, name: packageName };
    }

    return manifest;
  }
}

function isReleaseAgeSatisfied(
  registryClient: RegistryClient,
  metadata: PackageMetadata,
  version: string,
): boolean {
  const minReleaseAge = registryClient.minReleaseAge;
  if (!minReleaseAge || !metadata.time) {
    return true;
  }

  const publishTimeStr = metadata.time[version];
  if (!publishTimeStr) {
    return true;
  }

  const publishTime = Date.parse(publishTimeStr);
  if (isNaN(publishTime)) {
    return true;
  }

  return Date.now() - publishTime >= minReleaseAge;
}

export async function getSatisfyingVersion(
  registryClient: RegistryClient,
  metadata: PackageMetadata,
  range: string,
  next?: boolean,
): Promise<string | null> {
  const options = { includePrerelease: next || undefined };
  let candidates = metadata.versions.filter((v) => semver.satisfies(v, range, options));

  candidates = candidates.filter((version) =>
    isReleaseAgeSatisfied(registryClient, metadata, version),
  );

  const sorted = semver.rsort(candidates);

  for (const version of sorted) {
    const manifest = await registryClient.getManifest(metadata.name, version);
    if (manifest && !manifest.deprecated) {
      return version;
    }
  }

  // Fallback to deprecated versions if no non-deprecated version satisfies
  for (const version of sorted) {
    const manifest = await registryClient.getManifest(metadata.name, version);
    if (manifest) {
      return version;
    }
  }

  return null;
}

export function angularMajorCompatGuarantee(range: string) {
  let newRange = semver.validRange(range);
  if (!newRange) {
    return range;
  }
  let major = 1;
  while (!semver.gtr(major + '.0.0', newRange)) {
    major++;
    if (major >= 99) {
      return newRange;
    }
  }

  newRange = range;
  for (let minor = 0; minor < 20; minor++) {
    newRange += ` || ^${major}.${minor}.0-alpha.0 `;
  }

  return semver.validRange(newRange) || range;
}

const knownPeerCompatibleList: { [name: string]: PeerVersionTransform } = {
  '@angular/core': angularMajorCompatGuarantee,
};

export interface PackageVersionInfo {
  version: VersionRange;
  packageJson: PackageManifest;
  updateMetadata: UpdateMetadata;
}

export interface PackageInfo {
  name: string;
  npmPackageJson: PackageMetadata;
  installed: PackageVersionInfo;
  target?: PackageVersionInfo;
  packageJsonRange: string;
}

export interface UpdateMetadata {
  packageGroupName?: string;
  packageGroup: { [packageName: string]: string };
  requirements: { [packageName: string]: string };
  migrations?: string;
}

export interface UpdateResolverOptions {
  packages?: string[];
  force?: boolean;
  next?: boolean;
  migrateOnly?: boolean;
  from?: string;
  to?: string;
  registry?: string;
  packageManager?: string;
  verbose?: boolean;
  workspaceRoot?: string;
}

export interface UpdatePlan {
  packagesToUpdate: Map<string, string>; // name -> target version range
  migrationsToRun: { package: string; collection: string; from: string; to: string }[];
  packageInfoMap: Map<string, PackageInfo>;
  registryClient: RegistryClient;
}

function _updatePeerVersion(infoMap: Map<string, PackageInfo>, name: string, range: string) {
  const maybePackageInfo = infoMap.get(name);
  if (!maybePackageInfo) {
    return range;
  }
  if (maybePackageInfo.target) {
    name = maybePackageInfo.target.updateMetadata.packageGroupName || name;
  } else {
    name = maybePackageInfo.installed.updateMetadata.packageGroupName || name;
  }

  const maybeTransform = knownPeerCompatibleList[name];
  if (maybeTransform) {
    if (typeof maybeTransform == 'function') {
      return maybeTransform(range);
    } else {
      return maybeTransform;
    }
  }

  return range;
}

function _validateForwardPeerDependencies(
  name: string,
  infoMap: Map<string, PackageInfo>,
  logger: logging.LoggerApi,
): boolean {
  let error = false;
  const info = infoMap.get(name);
  if (!info || !info.target) {
    return error;
  }

  const peerDependencies = info.target.packageJson.peerDependencies || {};
  const peerDependenciesMeta = info.target.packageJson.peerDependenciesMeta || {};

  for (const [peer, range] of Object.entries(peerDependencies)) {
    const peerInfo = infoMap.get(peer);
    if (!peerInfo) {
      continue;
    }

    const isOptional = !!peerDependenciesMeta[peer]?.optional;
    const resolvedRange = _updatePeerVersion(infoMap, peer, range);
    const resolvedVersion = peerInfo.target ? peerInfo.target.version : peerInfo.installed.version;

    if (!semver.satisfies(resolvedVersion, resolvedRange, { includePrerelease: true })) {
      logger.error(
        `Package ${JSON.stringify(name)} has an incompatible peer dependency to ` +
          `${JSON.stringify(peer)} (requires ${JSON.stringify(range)}, ` +
          `would install ${JSON.stringify(resolvedVersion)}).`,
      );
      error = error || !isOptional;
    }
  }

  return error;
}

function _validateReversePeerDependencies(
  name: string,
  version: string,
  infoMap: Map<string, PackageInfo>,
  logger: logging.LoggerApi,
  next: boolean,
): boolean {
  let error = false;
  for (const [installed, installedInfo] of infoMap.entries()) {
    const installedLogger = logger.createChild(installed);
    installedLogger.debug(`${installed}...`);
    const peers = (installedInfo.target || installedInfo.installed).packageJson.peerDependencies;
    const peersMeta = (installedInfo.target || installedInfo.installed).packageJson
      .peerDependenciesMeta;

    for (const [peer, range] of Object.entries(peers || {})) {
      if (peer !== name) {
        continue;
      }

      const isOptional = !!peersMeta?.[peer]?.optional;
      const resolvedRange = _updatePeerVersion(infoMap, name, range);
      if (!semver.satisfies(version, resolvedRange, { includePrerelease: next || undefined })) {
        logger.error(
          `Package ${JSON.stringify(installed)} has an incompatible peer dependency to ` +
            `${JSON.stringify(name)} (requires ${JSON.stringify(range)}, ` +
            `would install ${JSON.stringify(version)}).`,
        );
        error = error || !isOptional;
      }
    }
  }

  return error;
}

function _validateUpdatePackages(
  infoMap: Map<string, PackageInfo>,
  force: boolean,
  next: boolean,
  logger: logging.LoggerApi,
): void {
  logger.debug('Validating peer dependencies...');
  let error = false;

  for (const name of infoMap.keys()) {
    const info = infoMap.get(name);
    if (!info || !info.target) {
      continue;
    }

    logger.debug(`Checking ${name}...`);
    error = _validateForwardPeerDependencies(name, infoMap, logger) || error;
    error =
      _validateReversePeerDependencies(name, info.target.version, infoMap, logger, next) || error;
  }

  if (error && !force) {
    throw new Error(
      'Incompatible peer dependencies found. See above for details. ' +
        'You can bypass this check using the --force option.',
    );
  }
}

function _getUpdateMetadata(
  packageJson: PackageManifest,
  logger: logging.LoggerApi,
): UpdateMetadata {
  const metadata = packageJson['ng-update'] as Record<string, unknown> | undefined;

  const result: UpdateMetadata = {
    packageGroup: {},
    requirements: {},
  };

  if (!metadata || typeof metadata != 'object' || Array.isArray(metadata)) {
    return result;
  }

  if (metadata['packageGroup']) {
    const packageGroup = metadata['packageGroup'];
    if (Array.isArray(packageGroup) && packageGroup.every((x) => typeof x == 'string')) {
      result.packageGroup = packageGroup.reduce(
        (group, name) => {
          group[name] = packageJson.version;

          return group;
        },
        {} as { [key: string]: string },
      );
    } else if (typeof packageGroup == 'object' && packageGroup !== null) {
      result.packageGroup = Object.entries(packageGroup).reduce(
        (group, [name, version]) => {
          if (typeof version == 'string') {
            group[name] = version;
          }

          return group;
        },
        {} as { [key: string]: string },
      );
    } else {
      logger.warn(`PackageGroup metadata for ${packageJson.name} is malformed. Ignoring.`);
    }
  }

  if (typeof metadata['packageGroupName'] == 'string') {
    result.packageGroupName = metadata['packageGroupName'];
  }

  if (typeof metadata['migrations'] == 'string') {
    result.migrations = metadata['migrations'];
  }

  return result;
}

export function isPnpActive(workspaceRoot: string): boolean {
  return (
    process.versions.pnp !== undefined ||
    existsSync(path.join(workspaceRoot, '.pnp.cjs')) ||
    existsSync(path.join(workspaceRoot, '.pnp.js'))
  );
}

export function findPackageJson(workspaceDir: string, packageName: string): string | undefined {
  if (isPnpActive(workspaceDir)) {
    try {
      const workspaceRequire = createRequire(path.join(workspaceDir, 'package.json'));

      return workspaceRequire.resolve(`${packageName}/package.json`);
    } catch {
      return undefined;
    }
  }

  let currentDir = workspaceDir;
  while (true) {
    const candidatePath = path.join(currentDir, 'node_modules', packageName, 'package.json');
    if (existsSync(candidatePath)) {
      return realpathSync(candidatePath);
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
  }

  return undefined;
}

function getInstalledPackageJson(
  packageName: string,
  workspaceRoot: string,
): PackageManifest | null {
  try {
    const manifestPath = findPackageJson(workspaceRoot, packageName);
    if (manifestPath) {
      const content = readFileSync(manifestPath, 'utf8');

      return JSON.parse(content) as PackageManifest;
    }
  } catch {}

  return null;
}

function getInstalledVersion(packageName: string, workspaceRoot: string): string | null {
  const pkgJson = getInstalledPackageJson(packageName, workspaceRoot);

  return pkgJson?.version ?? null;
}

function _buildLocalPackageInfo(
  name: string,
  allDependencies: ReadonlyMap<string, VersionRange>,
  workspaceRoot: string,
): PackageInfo {
  const packageJsonRange = allDependencies.get(name);
  if (!packageJsonRange) {
    throw new Error(`Package ${JSON.stringify(name)} was not found in package.json.`);
  }

  const localPkgJson = getInstalledPackageJson(name, workspaceRoot);
  if (!localPkgJson) {
    throw new Error(`Package ${name} is not installed.`);
  }

  const installedVersion = localPkgJson.version;
  const npmPackageJson: PackageMetadata = {
    name,
    versions: [installedVersion],
    'dist-tags': {},
  };

  const logger = new logging.NullLogger();

  return {
    name,
    npmPackageJson,
    installed: {
      version: installedVersion as VersionRange,
      packageJson: localPkgJson,
      updateMetadata: _getUpdateMetadata(localPkgJson, logger),
    },
    packageJsonRange,
  };
}

async function _buildPackageInfo(
  packages: Map<string, VersionRange>,
  allDependencies: ReadonlyMap<string, VersionRange>,
  npmPackageJson: PackageMetadata,
  workspaceRoot: string,
  registryClient: RegistryClient,
  logger: logging.LoggerApi,
): Promise<PackageInfo> {
  const name = npmPackageJson.name;
  const packageJsonRange = allDependencies.get(name);
  if (!packageJsonRange) {
    throw new Error(`Package ${JSON.stringify(name)} was not found in package.json.`);
  }

  const localPkgJson = getInstalledPackageJson(name, workspaceRoot);
  let installedVersion = localPkgJson?.version;

  if (!installedVersion) {
    installedVersion = (await getSatisfyingVersion(
      registryClient,
      npmPackageJson,
      packageJsonRange,
    )) as VersionRange | undefined;
  }

  if (!installedVersion) {
    throw new Error(
      `An unexpected error happened; could not determine version for package ${name}.`,
    );
  }

  const installedPackageJson =
    localPkgJson || (await registryClient.getManifest(name, installedVersion));
  if (!installedPackageJson) {
    throw new Error(
      `An unexpected error happened; package ${name} has no version ${installedVersion}.`,
    );
  }

  let targetVersion: VersionRange | undefined = packages.get(name);
  if (targetVersion) {
    const distTags = npmPackageJson['dist-tags'] ?? {};
    let resolvedVersion: string | undefined =
      distTags[targetVersion] ?? (targetVersion === 'next' ? distTags['latest'] : undefined);

    if (
      resolvedVersion &&
      !isReleaseAgeSatisfied(registryClient, npmPackageJson, resolvedVersion)
    ) {
      resolvedVersion = undefined;
    }

    if (resolvedVersion) {
      targetVersion = resolvedVersion as VersionRange;
    } else {
      targetVersion = (await getSatisfyingVersion(
        registryClient,
        npmPackageJson,
        distTags[targetVersion] || targetVersion === 'next' ? '*' : targetVersion,
      )) as VersionRange | undefined;
    }
  }

  if (targetVersion && semver.lte(targetVersion, installedVersion)) {
    logger.debug(`Package ${name} already satisfied by package.json (${packageJsonRange}).`);
    targetVersion = undefined;
  }

  let target: PackageVersionInfo | undefined;
  if (targetVersion) {
    const targetPackageJson = await registryClient.getManifest(name, targetVersion);
    if (targetPackageJson) {
      target = {
        version: targetVersion,
        packageJson: targetPackageJson,
        updateMetadata: _getUpdateMetadata(targetPackageJson, logger),
      };
    }
  }

  return {
    name,
    npmPackageJson,
    installed: {
      version: installedVersion as VersionRange,
      packageJson: installedPackageJson,
      updateMetadata: _getUpdateMetadata(installedPackageJson, logger),
    },
    target,
    packageJsonRange,
  };
}

function splitPackageName(pkg: string): { name: string; version?: string } {
  let name = pkg;
  let version: string | undefined;

  if (pkg.startsWith('@')) {
    const parts = pkg.split('@');
    name = '@' + parts[1];
    version = parts[2];
  } else if (pkg.includes('@')) {
    const parts = pkg.split('@');
    name = parts[0];
    version = parts[1];
  }

  return { name, version };
}

function _buildPackageList(
  options: UpdateResolverOptions,
  allDependencies: ReadonlyMap<string, VersionRange>,
  logger: logging.LoggerApi,
): Map<string, VersionRange> {
  const packages = new Map<string, VersionRange>();
  const inputPackages = options.packages ?? [];

  if (inputPackages.length === 0) {
    return packages;
  }

  for (const pkg of inputPackages) {
    const { name: pkgName, version: pkgVersion } = splitPackageName(pkg);

    if (!allDependencies.has(pkgName)) {
      throw new Error(`Package ${JSON.stringify(pkgName)} is not in package.json.`);
    }

    let targetVersion = pkgVersion;
    if (options.migrateOnly && !targetVersion && options.from) {
      targetVersion = options.from;
    }

    packages.set(pkgName, (targetVersion || (options.next ? 'next' : 'latest')) as VersionRange);
  }

  return packages;
}

async function resolvePackageVersion(
  registryClient: RegistryClient,
  metadata: PackageMetadata,
  range: string,
  next = false,
): Promise<string | null> {
  const distTags = metadata['dist-tags'] ?? {};
  let resolvedVersion: string | undefined =
    distTags[range] ?? (range === 'next' ? distTags['latest'] : undefined);

  if (resolvedVersion && !isReleaseAgeSatisfied(registryClient, metadata, resolvedVersion)) {
    resolvedVersion = undefined;
  }

  if (resolvedVersion) {
    return resolvedVersion;
  }

  return getSatisfyingVersion(
    registryClient,
    metadata,
    distTags[range] || range === 'next' ? '*' : range,
    next,
  );
}

async function _addPackageGroup(
  packages: Map<string, VersionRange>,
  allDependencies: ReadonlyMap<string, VersionRange>,
  metadata: PackageMetadata,
  registryClient: RegistryClient,
  logger: logging.LoggerApi,
): Promise<void> {
  const maybePackage = packages.get(metadata.name);
  if (!maybePackage) {
    return;
  }

  const distTags = metadata['dist-tags'] ?? {};
  let version = maybePackage;
  let resolvedVersion: string | undefined =
    distTags[version] ?? (version === 'next' ? distTags['latest'] : undefined);

  if (resolvedVersion && !isReleaseAgeSatisfied(registryClient, metadata, resolvedVersion)) {
    resolvedVersion = undefined;
  }

  if (resolvedVersion) {
    version = resolvedVersion as VersionRange;
  } else {
    version =
      ((await getSatisfyingVersion(
        registryClient,
        metadata,
        distTags[version] || version === 'next' ? '*' : version,
      )) as VersionRange | null) ?? version;
  }

  const packageJson = await registryClient.getManifest(metadata.name, version);
  if (!packageJson) {
    return;
  }
  const ngUpdateMetadata = packageJson['ng-update'];
  if (!ngUpdateMetadata) {
    return;
  }

  const packageGroup = ngUpdateMetadata['packageGroup'];
  if (!packageGroup) {
    return;
  }
  let packageGroupNormalized: Record<string, string>;
  if (Array.isArray(packageGroup) && !packageGroup.some((x) => typeof x != 'string')) {
    packageGroupNormalized = packageGroup.reduce(
      (acc, curr) => {
        acc[curr] = version;

        return acc;
      },
      {} as Record<string, string>,
    );
  } else if (typeof packageGroup === 'object' && packageGroup !== null) {
    packageGroupNormalized = Object.entries(packageGroup).reduce(
      (acc, [name, v]) => {
        if (typeof v === 'string') {
          acc[name] = v;
        }

        return acc;
      },
      {} as Record<string, string>,
    );
  } else {
    logger.warn(`PackageGroup metadata for ${metadata.name} is malformed. Ignoring.`);

    return;
  }

  for (const [member, memberVersion] of Object.entries(packageGroupNormalized)) {
    if (packages.has(member)) {
      continue;
    }
    if (allDependencies.has(member)) {
      packages.set(member, memberVersion as VersionRange);
    }
  }
}

async function _addPeerDependencies(
  packages: Map<string, VersionRange>,
  allDependencies: ReadonlyMap<string, VersionRange>,
  npmPackageJson: PackageMetadata,
  workspaceRoot: string,
  registryClient: RegistryClient,
  logger: logging.LoggerApi,
): Promise<void> {
  const maybePackage = packages.get(npmPackageJson.name);
  if (!maybePackage) {
    return;
  }

  const distTags = npmPackageJson['dist-tags'] ?? {};
  const version = distTags[maybePackage] || maybePackage;
  const packageJson = await registryClient.getManifest(npmPackageJson.name, version);
  if (!packageJson) {
    return;
  }

  for (const [peer, range] of Object.entries(packageJson.peerDependencies || {})) {
    if (packages.has(peer)) {
      continue;
    }

    const installedVersion = getInstalledVersion(peer, workspaceRoot);
    if (installedVersion) {
      if (semver.satisfies(installedVersion, range)) {
        continue;
      }
    } else {
      const packageJsonRange = allDependencies.get(peer);
      if (packageJsonRange) {
        const peerMetadata = await registryClient.getMetadata(peer);
        if (peerMetadata) {
          const resolvedInstalledVersion = await getSatisfyingVersion(
            registryClient,
            peerMetadata,
            packageJsonRange,
          );

          if (resolvedInstalledVersion && semver.satisfies(resolvedInstalledVersion, range)) {
            continue;
          }
        }
      }
    }

    packages.set(peer, range as VersionRange);
  }
}

function _formatVersion(v?: string): string | undefined {
  if (v === undefined) {
    return v;
  }
  if (semver.valid(v)) {
    return v;
  }
  const coerced = semver.coerce(v);

  return coerced ? coerced.toString() : undefined;
}

function getRegistryNameAndRange(name: string, specifier: string): { name: string; range: string } {
  try {
    const result = npa.resolve(name, specifier);
    if (result.type === 'alias' && result.subSpec) {
      return {
        name: result.subSpec.name ?? name,
        range: result.subSpec.fetchSpec ?? specifier,
      };
    }
  } catch {}

  return { name, range: specifier };
}

function isPkgFromRegistry(name: string, specifier: string): boolean {
  const result = npa.resolve(name, specifier);

  return !!result.registry;
}

async function checkCatalogUpdates(
  normalizedPackages: string[],
  packageJsonContent: PackageManifest,
  registryClient: RegistryClient,
  workspaceRoot: string,
  options: UpdateResolverOptions,
): Promise<void> {
  const catalogUpdates: { name: string; current: string; target: string; specifier: string }[] = [];

  for (const requestedPkg of normalizedPackages) {
    const { name: pkgName } = splitPackageName(requestedPkg);
    const specifier =
      packageJsonContent.dependencies?.[pkgName] ||
      packageJsonContent.devDependencies?.[pkgName] ||
      packageJsonContent.peerDependencies?.[pkgName];

    if (specifier?.startsWith('catalog:')) {
      const current = getInstalledVersion(pkgName, workspaceRoot) ?? 'unknown';
      let target = 'latest';
      try {
        const metadata = await registryClient.getMetadata(pkgName);
        if (metadata) {
          const resolved = await resolvePackageVersion(
            registryClient,
            metadata,
            options.next ? 'next' : 'latest',
            !!options.next,
          );
          target = resolved ?? 'latest';
        }
      } catch {
        // Fallback to 'latest' tag
      }

      catalogUpdates.push({ name: pkgName, current, target, specifier });
    }
  }

  if (catalogUpdates.length > 0) {
    const packageManagerName = options.packageManager ?? 'your package manager';
    const installCmd = packageManagerName === 'yarn' ? 'yarn install' : 'pnpm install';

    const updatesList = catalogUpdates
      .map((pkg) => `  - ${pkg.name} (${pkg.specifier}) -> Target version: ${pkg.target}`)
      .join('\n');

    const migrationCommands = catalogUpdates
      .map((pkg) => {
        const fromVer = pkg.current === 'unknown' ? '<current-version>' : pkg.current;

        return `  ng update ${pkg.name} --migrate-only --from ${fromVer}`;
      })
      .join('\n');

    throw new Error(
      `The following packages to update are configured to use \`catalog:\`:\n` +
        `${updatesList}\n\n` +
        `Because catalogs are shared across the monorepo, 'ng update' cannot modify them directly.\n` +
        `Please perform the following steps to update:\n` +
        `  1. Manually update the versions for these packages in your catalog configuration file ` +
        `(e.g., pnpm-workspace.yaml or .yarnrc.yml).\n` +
        `  2. Run '${installCmd}' to install the updated versions.\n` +
        `  3. Run the following command(s) from the workspace root to execute the migration schematics:\n` +
        `${migrationCommands}`,
    );
  }
}

export async function resolveUserUpdatePlan(
  options: UpdateResolverOptions,
  packageManager: PackageManager,
  logger: logging.LoggerApi,
): Promise<UpdatePlan> {
  const workspaceRoot = options.workspaceRoot ?? process.cwd();
  const packageJsonPath = path.join(workspaceRoot, 'package.json');
  if (!existsSync(packageJsonPath)) {
    throw new Error('Could not find a package.json. Are you in a Node project?');
  }

  const rawJson = readFileSync(packageJsonPath, 'utf8');
  const packageJsonContent = JSON.parse(rawJson) as PackageManifest;

  const getDependencies = (deps: Record<string, string> | undefined) =>
    Object.entries(deps ?? {}).map(([name, range]) => [name, range] as const);

  const allRawDeps = [
    ...getDependencies(packageJsonContent.dependencies),
    ...getDependencies(packageJsonContent.devDependencies),
    ...getDependencies(packageJsonContent.peerDependencies),
  ];

  const npmDeps = new Map(
    allRawDeps.filter(([name, specifier]) => {
      try {
        return isPkgFromRegistry(name, specifier);
      } catch {
        logger.warn(`Package ${name} was not found on the registry. Skipping.`);

        return false;
      }
    }) as [string, VersionRange][],
  );

  const packagesOption = options.packages ?? [];
  const normalizedPackages = packagesOption.reduce((acc, curr) => {
    return acc.concat(curr.split(','));
  }, [] as string[]);
  options.packages = normalizedPackages;

  if (options.migrateOnly && options.from) {
    if (options.packages.length !== 1) {
      throw new Error('--from requires that only a single package be passed.');
    }
  }

  options.from = _formatVersion(options.from);
  options.to = _formatVersion(options.to);
  const usingYarn = options.packageManager === 'yarn';

  const minReleaseAge = await packageManager.getMinimumReleaseAge();

  const getRegistryName = (name: string): string => {
    const specifier = npmDeps.get(name);
    if (specifier) {
      return getRegistryNameAndRange(name, specifier).name;
    }

    return name;
  };

  const registryClient = new RegistryClient(packageManager, logger, minReleaseAge, getRegistryName);

  await checkCatalogUpdates(
    normalizedPackages,
    packageJsonContent,
    registryClient,
    workspaceRoot,
    options,
  );

  const packages = _buildPackageList(options, npmDeps, logger);

  const getOrFetchPackageMetadata = async (
    packageName: string,
  ): Promise<PackageMetadata | null> => {
    return registryClient.getMetadata(packageName);
  };

  if (packages.size === 0) {
    await Promise.all(
      Array.from(npmDeps.keys()).map(async (depName) => {
        await getOrFetchPackageMetadata(depName);
      }),
    );
  } else {
    let lastPackagesSize;
    do {
      lastPackagesSize = packages.size;

      let lastGroupSize;
      do {
        lastGroupSize = packages.size;
        for (const name of Array.from(packages.keys())) {
          const metadata = await getOrFetchPackageMetadata(name);
          const spec = packages.get(name);
          if (metadata && spec) {
            const resolvedVersion = await resolvePackageVersion(
              registryClient,
              metadata,
              spec,
              !!options.next,
            );
            if (resolvedVersion) {
              packages.set(name, resolvedVersion as VersionRange);
            }
            await _addPackageGroup(packages, npmDeps, metadata, registryClient, logger);
          }
        }
      } while (packages.size > lastGroupSize);

      for (const name of Array.from(packages.keys())) {
        const metadata = await getOrFetchPackageMetadata(name);
        const spec = packages.get(name);
        if (metadata && spec) {
          const resolvedVersion = await resolvePackageVersion(
            registryClient,
            metadata,
            spec,
            !!options.next,
          );
          if (resolvedVersion) {
            packages.set(name, resolvedVersion as VersionRange);
          }
          await _addPeerDependencies(
            packages,
            npmDeps,
            metadata,
            workspaceRoot,
            registryClient,
            logger,
          );
        }
      }
    } while (packages.size > lastPackagesSize);
  }

  const packageInfoEntries = await Promise.all(
    Array.from(npmDeps.keys(), async (depName) => {
      const isUpdating = packages.has(depName);
      const localPkgJson = getInstalledPackageJson(depName, workspaceRoot);

      if (isUpdating || !localPkgJson) {
        const metadata = await getOrFetchPackageMetadata(depName);
        if (metadata) {
          const info = await _buildPackageInfo(
            packages,
            npmDeps,
            metadata,
            workspaceRoot,
            registryClient,
            logger,
          );

          return [depName, info] as const;
        }
      }

      return [depName, _buildLocalPackageInfo(depName, npmDeps, workspaceRoot)] as const;
    }),
  );
  const packageInfoMap = new Map<string, PackageInfo>(packageInfoEntries);

  const packagesToUpdate = new Map<string, string>();
  const migrationsToRun: { package: string; collection: string; from: string; to: string }[] = [];

  if (packages.size > 0) {
    if (!(options.migrateOnly && options.from && options.packages)) {
      const sublog = new logging.LevelCapLogger('validation', logger.createChild(''), 'warn');
      _validateUpdatePackages(packageInfoMap, !!options.force, !!options.next, sublog);

      for (const [name, info] of packageInfoMap.entries()) {
        if (!info.target || !info.installed) {
          continue;
        }
        packagesToUpdate.set(name, info.target.version);

        if (info.target.updateMetadata.migrations) {
          migrationsToRun.push({
            package: name,
            collection: info.target.updateMetadata.migrations,
            from: info.installed.version,
            to: info.target.version,
          });
        }
      }
    }
  }

  return {
    packagesToUpdate,
    migrationsToRun,
    packageInfoMap,
    registryClient,
  };
}

export async function printUpdateUsageMessage(
  infoMap: Map<string, PackageInfo>,
  registryClient: RegistryClient,
  logger: logging.LoggerApi,
  next = false,
): Promise<void> {
  const packageGroups = new Map<string, string>();
  const mappedPackages = await Promise.all(
    Array.from(infoMap.entries(), async ([name, info]) => {
      const distTags = info.npmPackageJson['dist-tags'] ?? {};
      let tag = next ? (distTags['next'] ? 'next' : 'latest') : 'latest';
      let version = distTags[tag] ?? info.installed.version;
      const versions = info.npmPackageJson.versions ?? [];

      const versionDiff = semver.diff(info.installed.version, version);
      if (
        versionDiff !== 'patch' &&
        versionDiff !== 'minor' &&
        /^@(?:angular|nguniversal)\//.test(name)
      ) {
        const installedMajorVersion = semver.parse(info.installed.version)?.major;
        const toInstallMajorVersion = semver.parse(version)?.major;
        if (
          installedMajorVersion !== undefined &&
          toInstallMajorVersion !== undefined &&
          installedMajorVersion < toInstallMajorVersion - 1
        ) {
          const nextMajorVersion = `${installedMajorVersion + 1}.`;
          const nextMajorVersions = versions
            .filter((v) => v.startsWith(nextMajorVersion))
            .sort((a, b) => (a > b ? -1 : 1));

          if (nextMajorVersions.length) {
            version = nextMajorVersions[0];
            tag = '';
          }
        }
      }

      const target = info.target?.packageJson || (await registryClient.getManifest(name, version));

      return {
        name,
        info,
        version,
        tag,
        target,
      };
    }),
  );

  const packagesToUpdate = mappedPackages
    .filter(
      ({ info, version, target }) =>
        target?.['ng-update'] && semver.compare(info.installed.version, version) < 0,
    )
    .map(({ name, info, version, tag, target }) => {
      // Look for packageGroup.
      const ngUpdate = target?.['ng-update'] as Record<string, unknown> | undefined;
      const packageGroup = ngUpdate?.['packageGroup'];
      if (packageGroup) {
        const packageGroupNames = Array.isArray(packageGroup)
          ? packageGroup
          : Object.keys(packageGroup);
        const packageGroupName =
          (ngUpdate?.['packageGroupName'] as string | undefined) ||
          packageGroupNames.find((n) => infoMap.has(n));

        if (packageGroupName) {
          if (packageGroups.has(name)) {
            return null;
          }

          for (const groupName of packageGroupNames) {
            packageGroups.set(groupName, packageGroupName);
          }

          packageGroups.set(packageGroupName, packageGroupName);
          name = packageGroupName;
        }
      }

      let command = `ng update ${name}`;
      if (!tag) {
        command += `@${semver.parse(version)?.major || version}`;
      } else if (tag == 'next') {
        command += ' --next';
      }

      return [name, `${info.installed.version} -> ${version} `, command];
    })
    .filter((x): x is string[] => x !== null)
    .sort((a, b) => a[0].localeCompare(b[0]));

  if (packagesToUpdate.length == 0) {
    logger.info('We analyzed your package.json and everything seems to be in order. Good work!');

    return;
  }

  logger.info('We analyzed your package.json, there are some packages to update:\n');

  // Find the largest name to know the padding needed.
  let namePad = Math.max(...[...infoMap.keys()].map((x) => x.length)) + 2;
  if (!Number.isFinite(namePad)) {
    namePad = 30;
  }
  const pads = [namePad, 25, 0];

  logger.info(
    '  ' + ['Name', 'Version', 'Command to update'].map((x, i) => x.padEnd(pads[i])).join(''),
  );

  const totalWidth = pads.reduce((sum, width) => sum + width, 20);
  logger.info(` ${'-'.repeat(totalWidth)}`);

  packagesToUpdate.forEach((fields) => {
    if (!fields) {
      return;
    }

    logger.info('  ' + fields.map((x, i) => x.padEnd(pads[i])).join(''));
  });

  logger.info(
    `\nThere might be additional packages which don't provide 'ng update' capabilities that are outdated.\n` +
      `You can update the additional packages by running the update command of your package manager.`,
  );
}

export async function applyUpdatePlan(
  workspaceRoot: string,
  plan: UpdatePlan,
  logger: logging.LoggerApi,
): Promise<void> {
  const packageJsonPath = path.join(workspaceRoot, 'package.json');
  const packageJsonContent = await fs.readFile(packageJsonPath, 'utf8');
  const packageJson = JSON.parse(packageJsonContent) as PackageManifest;

  const updateDependency = (deps: Record<string, string>, name: string, newVersion: string) => {
    const oldVersion = deps[name];
    const aliasPrefix = 'npm:';

    // If the dependency uses an npm package alias (e.g., "npm:registry-name@version-range"),
    // parse and reconstruct the alias with the new target version while preserving
    // the original alias registry name and any version prefix character (like ^ or ~).
    if (oldVersion.startsWith(aliasPrefix)) {
      const specifier = oldVersion.slice(aliasPrefix.length);
      const lastAtIndex = specifier.lastIndexOf('@');
      if (lastAtIndex > 0) {
        const registryName = specifier.slice(0, lastAtIndex);
        const versionRange = specifier.slice(lastAtIndex + 1);
        // Retain any semantic versioning operator prefix (e.g., ^ or ~) from the target version range.
        const execResult = /^[\^~]/.exec(versionRange);
        deps[name] =
          `${aliasPrefix}${registryName}@${execResult ? execResult[0] : ''}${newVersion}`;
      } else {
        // If there's no `@` character defining a version specifier in the alias (e.g. "npm:packageName"),
        // leave it as-is without attempting to inject a version suffix.
        deps[name] = oldVersion;
      }
    } else {
      // Standard dependency formatting, keeping any semantic versioning operator prefix (e.g., ^ or ~).
      const execResult = /^[\^~]/.exec(oldVersion);
      deps[name] = `${execResult ? execResult[0] : ''}${newVersion}`;
    }
  };

  for (const [name, targetVersion] of plan.packagesToUpdate.entries()) {
    logger.info(`Updating package.json with dependency ${name} to version ${targetVersion}...`);

    if (packageJson.dependencies && packageJson.dependencies[name]) {
      updateDependency(packageJson.dependencies, name, targetVersion);
      if (packageJson.devDependencies) {
        delete packageJson.devDependencies[name];
      }
      if (packageJson.peerDependencies) {
        delete packageJson.peerDependencies[name];
      }
    } else if (packageJson.devDependencies && packageJson.devDependencies[name]) {
      updateDependency(packageJson.devDependencies, name, targetVersion);
      if (packageJson.peerDependencies) {
        delete packageJson.peerDependencies[name];
      }
    } else if (packageJson.peerDependencies && packageJson.peerDependencies[name]) {
      updateDependency(packageJson.peerDependencies, name, targetVersion);
    } else {
      if (!packageJson.dependencies) {
        packageJson.dependencies = {};
      }
      packageJson.dependencies[name] = `^${targetVersion}`;
    }
  }

  const eofMatches = packageJsonContent.match(/\r?\n$/);
  const eof = eofMatches?.[0] ?? '';
  const newContent = JSON.stringify(packageJson, null, 2) + eof;
  await fs.writeFile(packageJsonPath, newContent, 'utf8');
}
