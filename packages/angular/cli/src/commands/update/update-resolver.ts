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
  ) {}

  async getMetadata(packageName: string): Promise<PackageMetadata | null> {
    let promise = this.metadataCache.get(packageName);
    if (!promise) {
      promise = this.packageManager.getRegistryMetadata(packageName);
      this.metadataCache.set(packageName, promise);
    }

    return promise;
  }

  async getManifest(packageName: string, version: string): Promise<PackageManifest | null> {
    const key = `${packageName}@${version}`;
    let promise = this.manifestCache.get(key);
    if (!promise) {
      promise = this.packageManager.getRegistryManifest(packageName, version);
      this.manifestCache.set(key, promise);
    }

    return promise;
  }
}

export async function getSatisfyingVersion(
  registryClient: RegistryClient,
  packageName: string,
  versions: string[],
  range: string,
  next?: boolean,
): Promise<string | null> {
  const options = { includePrerelease: next || undefined };
  const candidates = versions.filter((v) => semver.satisfies(v, range, options));
  const sorted = semver.rsort(candidates);

  for (const version of sorted) {
    const manifest = await registryClient.getManifest(packageName, version);
    if (manifest && !manifest.deprecated) {
      return version;
    }
  }

  // Fallback to deprecated versions if no non-deprecated version satisfies
  for (const version of sorted) {
    const manifest = await registryClient.getManifest(packageName, version);
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
      name,
      npmPackageJson.versions,
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
    if (distTags[targetVersion]) {
      targetVersion = distTags[targetVersion] as VersionRange;
    } else if (targetVersion == 'next') {
      targetVersion = distTags['latest'] as VersionRange;
    } else {
      targetVersion = (await getSatisfyingVersion(
        registryClient,
        name,
        npmPackageJson.versions,
        targetVersion,
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
    let pkgName = pkg;
    let pkgVersion: string | undefined;

    if (pkg.startsWith('@')) {
      const parts = pkg.split('@');
      pkgName = '@' + parts[1];
      pkgVersion = parts[2];
    } else if (pkg.includes('@')) {
      const parts = pkg.split('@');
      pkgName = parts[0];
      pkgVersion = parts[1];
    }

    if (!allDependencies.has(pkgName)) {
      throw new Error(`Package ${JSON.stringify(pkgName)} is not in package.json.`);
    }

    if (options.migrateOnly && !pkgVersion && options.from) {
      pkgVersion = options.from;
    }

    packages.set(pkgName, (pkgVersion || (options.next ? 'next' : 'latest')) as VersionRange);
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
  if (distTags[range]) {
    return distTags[range];
  }
  if (range === 'next') {
    return distTags['latest'] ?? null;
  }

  return getSatisfyingVersion(registryClient, metadata.name, metadata.versions, range, next);
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
  if (distTags[version]) {
    version = distTags[version] as VersionRange;
  } else if (version === 'next') {
    version = distTags['latest'] as VersionRange;
  } else {
    version =
      ((await getSatisfyingVersion(
        registryClient,
        metadata.name,
        metadata.versions,
        version,
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
            peer,
            peerMetadata.versions,
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

function isPkgFromRegistry(name: string, specifier: string): boolean {
  const result = npa.resolve(name, specifier);

  return !!result.registry;
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

  const packages = _buildPackageList(options, npmDeps, logger);
  const registryClient = new RegistryClient(packageManager, logger);

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

  const packageInfoMap = new Map<string, PackageInfo>();
  for (const depName of npmDeps.keys()) {
    const isUpdating = packages.has(depName);
    const localPkgJson = getInstalledPackageJson(depName, workspaceRoot);

    if (isUpdating || !localPkgJson) {
      const metadata = await getOrFetchPackageMetadata(depName);
      if (metadata) {
        packageInfoMap.set(
          depName,
          await _buildPackageInfo(
            packages,
            npmDeps,
            metadata,
            workspaceRoot,
            registryClient,
            logger,
          ),
        );
      } else {
        packageInfoMap.set(depName, _buildLocalPackageInfo(depName, npmDeps, workspaceRoot));
      }
    } else {
      packageInfoMap.set(depName, _buildLocalPackageInfo(depName, npmDeps, workspaceRoot));
    }
  }

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
  const mappedPackages = [];

  for (const [name, info] of infoMap.entries()) {
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

    mappedPackages.push({
      name,
      info,
      version,
      tag,
      target,
    });
  }

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
    const execResult = /^[\^~]/.exec(oldVersion);
    deps[name] = `${execResult ? execResult[0] : ''}${newVersion}`;
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
