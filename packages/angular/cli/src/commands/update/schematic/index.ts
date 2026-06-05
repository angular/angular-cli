/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { logging } from '@angular-devkit/core';
import { Rule, SchematicContext, SchematicsException, Tree } from '@angular-devkit/schematics';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import * as npa from 'npm-package-arg';
import * as semver from 'semver';
import {
  NpmRepositoryPackageJson,
  PackageManifest,
  getNpmPackageJson,
} from '../../../utilities/package-metadata';
import { Schema as UpdateSchema } from './schema';

type VersionRange = string & { __VERSION_RANGE: void };
type PeerVersionTransform = string | ((range: string) => string);

// Angular guarantees that a major is compatible with its following major (so packages that depend
// on Angular 5 are also compatible with Angular 6). This is, in code, represented by verifying
// that all other packages that have a peer dependency of `"@angular/core": "^5.0.0"` actually
// supports 6.0, by adding that compatibility to the range, so it is `^5.0.0 || ^6.0.0`.
// We export it to allow for testing.
export function angularMajorCompatGuarantee(range: string) {
  let newRange = semver.validRange(range);
  if (!newRange) {
    return range;
  }
  let major = 1;
  while (!semver.gtr(major + '.0.0', newRange)) {
    major++;
    if (major >= 99) {
      // Use original range if it supports a major this high
      // Range is most likely unbounded (e.g., >=5.0.0)
      return newRange;
    }
  }

  // Add the major version as compatible with the angular compatible, with all minors. This is
  // already one major above the greatest supported, because we increment `major` before checking.
  // We add minors like this because a minor beta is still compatible with a minor non-beta.
  newRange = range;
  for (let minor = 0; minor < 20; minor++) {
    newRange += ` || ^${major}.${minor}.0-alpha.0 `;
  }

  return semver.validRange(newRange) || range;
}

// This is a map of packageGroupName to range extending function. If it isn't found, the range is
// kept the same.
const knownPeerCompatibleList: { [name: string]: PeerVersionTransform } = {
  '@angular/core': angularMajorCompatGuarantee,
};

interface PackageVersionInfo {
  version: VersionRange;
  packageJson: PackageManifest;
  updateMetadata: UpdateMetadata;
}

interface PackageInfo {
  name: string;
  npmPackageJson: NpmRepositoryPackageJson;
  installed: PackageVersionInfo;
  target?: PackageVersionInfo;
  packageJsonRange: string;
}

interface UpdateMetadata {
  packageGroupName?: string;
  packageGroup: { [packageName: string]: string };
  requirements: { [packageName: string]: string };
  migrations?: string;
}

function _updatePeerVersion(infoMap: Map<string, PackageInfo>, name: string, range: string) {
  // Resolve packageGroupName.
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
  peers: { [name: string]: string },
  peersMeta: { [name: string]: { optional?: boolean } },
  logger: logging.LoggerApi,
  next: boolean,
): boolean {
  let validationFailed = false;
  for (const [peer, range] of Object.entries(peers)) {
    logger.debug(`Checking forward peer ${peer}...`);
    const maybePeerInfo = infoMap.get(peer);
    const isOptional = peersMeta[peer] && !!peersMeta[peer].optional;
    if (!maybePeerInfo) {
      if (!isOptional) {
        logger.warn(
          [
            `Package ${JSON.stringify(name)} has a missing peer dependency of`,
            `${JSON.stringify(peer)} @ ${JSON.stringify(range)}.`,
          ].join(' '),
        );
      }

      continue;
    }

    const peerVersion =
      maybePeerInfo.target && maybePeerInfo.target.packageJson.version
        ? maybePeerInfo.target.packageJson.version
        : maybePeerInfo.installed.version;

    logger.debug(`  Range intersects(${range}, ${peerVersion})...`);
    if (!semver.satisfies(peerVersion, range, { includePrerelease: next || undefined })) {
      logger.error(
        [
          `Package ${JSON.stringify(name)} has an incompatible peer dependency to`,
          `${JSON.stringify(peer)} (requires ${JSON.stringify(range)},`,
          `would install ${JSON.stringify(peerVersion)})`,
        ].join(' '),
      );

      validationFailed = true;
      continue;
    }
  }

  return validationFailed;
}

function _validateReversePeerDependencies(
  name: string,
  version: string,
  infoMap: Map<string, PackageInfo>,
  logger: logging.LoggerApi,
  next: boolean,
) {
  for (const [installed, installedInfo] of infoMap.entries()) {
    const installedLogger = logger.createChild(installed);
    installedLogger.debug(`${installed}...`);
    const peers = (installedInfo.target || installedInfo.installed).packageJson.peerDependencies;

    for (const [peer, range] of Object.entries(peers || {})) {
      if (peer != name) {
        // Only check peers to the packages we're updating. We don't care about peers
        // that are unmet but we have no effect on.
        continue;
      }

      // Ignore peerDependency mismatches for these packages.
      // They are deprecated and removed via a migration.
      const ignoredPackages = [
        'codelyzer',
        '@schematics/update',
        '@angular-devkit/build-ng-packagr',
        'tsickle',
        '@nguniversal/builders',
      ];
      if (ignoredPackages.includes(installed)) {
        continue;
      }

      // Override the peer version range if it's known as a compatible.
      const extendedRange = _updatePeerVersion(infoMap, peer, range);

      if (!semver.satisfies(version, extendedRange, { includePrerelease: next || undefined })) {
        logger.error(
          [
            `Package ${JSON.stringify(installed)} has an incompatible peer dependency to`,
            `${JSON.stringify(name)} (requires`,
            `${JSON.stringify(range)}${extendedRange == range ? '' : ' (extended)'},`,
            `would install ${JSON.stringify(version)}).`,
          ].join(' '),
        );

        return true;
      }
    }
  }

  return false;
}

function _validateUpdatePackages(
  infoMap: Map<string, PackageInfo>,
  force: boolean,
  next: boolean,
  logger: logging.LoggerApi,
): void {
  logger.debug('Updating the following packages:');
  infoMap.forEach((info) => {
    if (info.target) {
      logger.debug(`  ${info.name} => ${info.target.version}`);
    }
  });

  let peerErrors = false;
  infoMap.forEach((info) => {
    const { name, target } = info;
    if (!target) {
      return;
    }

    const pkgLogger = logger.createChild(name);
    logger.debug(`${name}...`);

    const { peerDependencies = {}, peerDependenciesMeta = {} } = target.packageJson;
    peerErrors =
      _validateForwardPeerDependencies(
        name,
        infoMap,
        peerDependencies,
        peerDependenciesMeta,
        pkgLogger,
        next,
      ) || peerErrors;
    peerErrors =
      _validateReversePeerDependencies(name, target.version, infoMap, pkgLogger, next) ||
      peerErrors;
  });

  if (!force && peerErrors) {
    throw new SchematicsException(
      'Incompatible peer dependencies found.\n' +
        'Peer dependency warnings when installing dependencies means that those dependencies might not work correctly together.\n' +
        `You can use the '--force' option to ignore incompatible peer dependencies and instead address these warnings later.`,
    );
  }
}

function _performUpdate(
  tree: Tree,
  context: SchematicContext,
  infoMap: Map<string, PackageInfo>,
  logger: logging.LoggerApi,
  migrateOnly: boolean,
): void {
  const packageJsonContent = tree.read('/package.json')?.toString();
  if (!packageJsonContent) {
    throw new SchematicsException('Could not find a package.json. Are you in a Node project?');
  }

  const packageJson = tree.readJson('/package.json') as PackageManifest;

  const updateDependency = (deps: Record<string, string>, name: string, newVersion: string) => {
    const oldVersion = deps[name];
    // We only respect caret and tilde ranges on update.
    const execResult = /^[\^~]/.exec(oldVersion);
    deps[name] = `${execResult ? execResult[0] : ''}${newVersion}`;
  };

  const toInstall = [...infoMap.values()]
    .map((x) => [x.name, x.target, x.installed])
    .filter(([name, target, installed]) => {
      return !!name && !!target && !!installed;
    }) as [string, PackageVersionInfo, PackageVersionInfo][];

  toInstall.forEach(([name, target, installed]) => {
    logger.info(
      `Updating package.json with dependency ${name} ` +
        `@ ${JSON.stringify(target.version)} (was ${JSON.stringify(installed.version)})...`,
    );

    if (packageJson.dependencies && packageJson.dependencies[name]) {
      updateDependency(packageJson.dependencies, name, target.version);

      if (packageJson.devDependencies && packageJson.devDependencies[name]) {
        delete packageJson.devDependencies[name];
      }
      if (packageJson.peerDependencies && packageJson.peerDependencies[name]) {
        delete packageJson.peerDependencies[name];
      }
    } else if (packageJson.devDependencies && packageJson.devDependencies[name]) {
      updateDependency(packageJson.devDependencies, name, target.version);

      if (packageJson.peerDependencies && packageJson.peerDependencies[name]) {
        delete packageJson.peerDependencies[name];
      }
    } else if (packageJson.peerDependencies && packageJson.peerDependencies[name]) {
      updateDependency(packageJson.peerDependencies, name, target.version);
    } else {
      logger.warn(`Package ${name} was not found in dependencies.`);
    }
  });
  const eofMatches = packageJsonContent.match(/\r?\n$/);
  const eof = eofMatches?.[0] ?? '';
  const newContent = JSON.stringify(packageJson, null, 2) + eof;
  if (packageJsonContent != newContent || migrateOnly) {
    if (!migrateOnly) {
      tree.overwrite('/package.json', newContent);
    }

    const externalMigrations: {}[] = [];

    // Run the migrate schematics with the list of packages to use. The collection contains
    // version information and we need to do this post installation. Please note that the
    // migration COULD fail and leave side effects on disk.
    // Run the schematics task of those packages.
    toInstall.forEach(([name, target, installed]) => {
      if (!target.updateMetadata.migrations) {
        return;
      }

      externalMigrations.push({
        package: name,
        collection: target.updateMetadata.migrations,
        from: installed.version,
        to: target.version,
      });

      return;
    });

    if (externalMigrations.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).externalMigrations = externalMigrations;
    }
  }
}

function _getUpdateMetadata(
  packageJson: PackageManifest,
  logger: logging.LoggerApi,
): UpdateMetadata {
  const metadata = packageJson['ng-update'];

  const result: UpdateMetadata = {
    packageGroup: {},
    requirements: {},
  };

  if (!metadata || typeof metadata != 'object' || Array.isArray(metadata)) {
    return result;
  }

  if (metadata['packageGroup']) {
    const packageGroup = metadata['packageGroup'];
    // Verify that packageGroup is an array of strings or an map of versions. This is not an error
    // but we still warn the user and ignore the packageGroup keys.
    if (Array.isArray(packageGroup) && packageGroup.every((x) => typeof x == 'string')) {
      result.packageGroup = packageGroup.reduce((group, name) => {
        group[name] = packageJson.version;

        return group;
      }, result.packageGroup);
    } else if (
      typeof packageGroup == 'object' &&
      packageGroup &&
      !Array.isArray(packageGroup) &&
      Object.values(packageGroup).every((x) => typeof x == 'string')
    ) {
      result.packageGroup = packageGroup;
    } else {
      logger.warn(`packageGroup metadata of package ${packageJson.name} is malformed. Ignoring.`);
    }

    result.packageGroupName = Object.keys(result.packageGroup)[0];
  }

  if (typeof metadata['packageGroupName'] == 'string') {
    result.packageGroupName = metadata['packageGroupName'];
  }

  if (metadata['migrations']) {
    const migrations = metadata['migrations'];
    if (typeof migrations != 'string') {
      logger.warn(`migrations metadata of package ${packageJson.name} is malformed. Ignoring.`);
    } else {
      result.migrations = migrations;
    }
  }

  return result;
}

function _usageMessage(
  options: UpdateSchema,
  infoMap: Map<string, PackageInfo>,
  logger: logging.LoggerApi,
) {
  const packageGroups = new Map<string, string>();
  const packagesToUpdate = [...infoMap.entries()]
    .map(([name, info]) => {
      const distTags = info.npmPackageJson['dist-tags'] ?? {};
      let tag = options.next ? (distTags['next'] ? 'next' : 'latest') : 'latest';
      let version = distTags[tag] ?? info.installed.version;
      const versions = info.npmPackageJson.versions ?? {};
      let target = versions[version];

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
          const nextMajorVersions = Object.keys(versions)
            .filter((v) => v.startsWith(nextMajorVersion))
            .sort((a, b) => (a > b ? -1 : 1));

          if (nextMajorVersions.length) {
            version = nextMajorVersions[0];
            target = versions[version];
            tag = '';
          }
        }
      }

      return {
        name,
        info,
        version,
        tag,
        target,
      };
    })
    .filter(
      ({ info, version, target }) =>
        target?.['ng-update'] && semver.compare(info.installed.version, version) < 0,
    )
    .map(({ name, info, version, tag, target }) => {
      // Look for packageGroup.
      const ngUpdate = target['ng-update'];
      const packageGroup = ngUpdate?.['packageGroup'];
      if (packageGroup) {
        const packageGroupNames = Array.isArray(packageGroup)
          ? packageGroup
          : Object.keys(packageGroup);
        const packageGroupName =
          ngUpdate?.['packageGroupName'] || packageGroupNames.find((n) => infoMap.has(n));

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
    .filter((x) => x !== null)
    .sort((a, b) => (a && b ? a[0].localeCompare(b[0]) : 0));

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

  return;
}

/**
 * Resolves a semver range or npm dist-tag to a specific version based on the package's registry metadata.
 * It prioritizes non-deprecated versions and handles fallback to deprecated versions if necessary.
 *
 * @private
 */
function resolvePackageVersion(
  metadata: NpmRepositoryPackageJson,
  range: string,
  next = false,
): string | null {
  // Check if range matches an npm dist-tag directly (e.g. "latest", "next")
  const distTags = metadata['dist-tags'] ?? {};
  if (distTags[range]) {
    return distTags[range];
  }
  // If 'next' is requested (e.g. via the --next CLI flag) but the package doesn't publish
  // a 'next' pre-release tag, fallback to 'latest'.
  if (range === 'next') {
    return distTags['latest'] ?? null;
  }

  // Split deprecated and non-deprecated versions from registry metadata
  const packageVersionsNonDeprecated: string[] = [];
  const packageVersionsDeprecated: string[] = [];
  for (const [v, { deprecated }] of Object.entries(metadata.versions ?? {})) {
    if (deprecated) {
      packageVersionsDeprecated.push(v);
    } else {
      packageVersionsNonDeprecated.push(v);
    }
  }

  // Find the highest satisfying version, prioritizing non-deprecated versions
  return (
    semver.maxSatisfying(packageVersionsNonDeprecated, range, {
      includePrerelease: next || undefined,
    }) ??
    semver.maxSatisfying(packageVersionsDeprecated, range, {
      includePrerelease: next || undefined,
    })
  );
}

/**
 * Checks if Yarn Plug'n'Play is active in the current workspace.
 *
 * @private
 */
function isPnpActive(workspaceRoot: string): boolean {
  return (
    process.versions.pnp !== undefined ||
    existsSync(path.join(workspaceRoot, '.pnp.cjs')) ||
    existsSync(path.join(workspaceRoot, '.pnp.js'))
  );
}

/**
 * Resolves and reads the installed package.json manifest for a package.
 * It checks the virtual schematic Tree first (vital for unit tests/mocks),
 * and falls back to physical disk resolution using createRequire only if Yarn PnP is active.
 *
 * @private
 */
function getInstalledPackageJson(
  tree: Tree,
  packageName: string,
  workspaceRoot: string,
): PackageManifest | null {
  // First, check the virtual tree (critical for testing mocks)
  const pkgJsonPath = `/node_modules/${packageName}/package.json`;
  if (tree.exists(pkgJsonPath)) {
    try {
      return tree.readJson(pkgJsonPath) as PackageManifest;
    } catch {}
  }

  // In Yarn PnP, mock package trees are not written to node_modules in the virtual tree,
  // so we resolve the manifest physically from Yarn's zip cache via createRequire.
  // Note: This fallback resolution is strictly gated on Yarn PnP being active. Because schematics
  // operate on a virtual file system (Tree), running disk lookups in non-PnP
  // environments could cause tests to resolve dependencies from this monorepo's own node_modules
  // instead of the simulated virtual file system.
  if (isPnpActive(workspaceRoot)) {
    try {
      const workspaceRequire = createRequire(path.join(workspaceRoot, 'package.json'));
      const manifestPath = workspaceRequire.resolve(`${packageName}/package.json`);
      const content = readFileSync(manifestPath, 'utf8');

      return JSON.parse(content) as PackageManifest;
    } catch {}
  }

  return null;
}

function getInstalledVersion(
  tree: Tree,
  packageName: string,
  workspaceRoot: string,
): string | null {
  const pkgJson = getInstalledPackageJson(tree, packageName, workspaceRoot);

  return pkgJson?.version ?? null;
}

function _buildLocalPackageInfo(
  tree: Tree,
  name: string,
  allDependencies: ReadonlyMap<string, VersionRange>,
  workspaceRoot: string,
  logger: logging.LoggerApi,
): PackageInfo {
  const packageJsonRange = allDependencies.get(name);
  if (!packageJsonRange) {
    throw new SchematicsException(`Package ${JSON.stringify(name)} was not found in package.json.`);
  }

  const localPkgJson = getInstalledPackageJson(tree, name, workspaceRoot);
  if (!localPkgJson) {
    throw new SchematicsException(`Package ${name} is not installed.`);
  }

  return {
    name,
    npmPackageJson: {} as NpmRepositoryPackageJson,
    installed: {
      version: localPkgJson.version as VersionRange,
      packageJson: localPkgJson,
      updateMetadata: _getUpdateMetadata(localPkgJson, logger),
    },
    packageJsonRange,
  };
}

function _buildPackageInfo(
  tree: Tree,
  packages: Map<string, VersionRange>,
  allDependencies: ReadonlyMap<string, VersionRange>,
  npmPackageJson: NpmRepositoryPackageJson,
  workspaceRoot: string,
  logger: logging.LoggerApi,
): PackageInfo {
  const name = npmPackageJson.name;
  const packageJsonRange = allDependencies.get(name);
  if (!packageJsonRange) {
    throw new SchematicsException(`Package ${JSON.stringify(name)} was not found in package.json.`);
  }

  const localPkgJson = getInstalledPackageJson(tree, name, workspaceRoot);
  let installedVersion = localPkgJson?.version;

  const packageVersionsNonDeprecated: string[] = [];
  const packageVersionsDeprecated: string[] = [];

  for (const [version, { deprecated }] of Object.entries(npmPackageJson.versions ?? {})) {
    if (deprecated) {
      packageVersionsDeprecated.push(version);
    } else {
      packageVersionsNonDeprecated.push(version);
    }
  }

  const findSatisfyingVersion = (targetVersion: VersionRange): VersionRange | undefined =>
    ((semver.maxSatisfying(packageVersionsNonDeprecated, targetVersion) ??
      semver.maxSatisfying(packageVersionsDeprecated, targetVersion)) as VersionRange | null) ??
    undefined;

  if (!installedVersion) {
    // Find the version from NPM that fits the range to max.
    installedVersion = findSatisfyingVersion(packageJsonRange);
  }

  if (!installedVersion) {
    throw new SchematicsException(
      `An unexpected error happened; could not determine version for package ${name}.`,
    );
  }

  const versions = npmPackageJson.versions ?? {};
  const installedPackageJson = versions[installedVersion] || localPkgJson;
  if (!installedPackageJson) {
    throw new SchematicsException(
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
      targetVersion = findSatisfyingVersion(targetVersion);
    }
  }

  if (targetVersion && semver.lte(targetVersion, installedVersion)) {
    logger.debug(`Package ${name} already satisfied by package.json (${packageJsonRange}).`);
    targetVersion = undefined;
  }

  const target: PackageVersionInfo | undefined = targetVersion
    ? {
        version: targetVersion,
        packageJson: versions[targetVersion],
        updateMetadata: _getUpdateMetadata(versions[targetVersion], logger),
      }
    : undefined;

  return {
    name,
    npmPackageJson,
    installed: {
      version: installedVersion as VersionRange,
      packageJson: installedPackageJson as PackageManifest,
      updateMetadata: _getUpdateMetadata(installedPackageJson as PackageManifest, logger),
    },
    target,
    packageJsonRange,
  };
}

function _buildPackageList(
  options: UpdateSchema,
  projectDeps: Map<string, VersionRange>,
  logger: logging.LoggerApi,
): Map<string, VersionRange> {
  // Parse the packages options to set the targeted version.
  const packages = new Map<string, VersionRange>();
  const commandLinePackages =
    options.packages && options.packages.length > 0 ? options.packages : [];

  for (const pkg of commandLinePackages) {
    // Split the version asked on command line.
    const m = pkg.match(/^((?:@[^/]{1,100}\/)?[^@]{1,100})(?:@(.{1,100}))?$/);
    if (!m) {
      logger.warn(`Invalid package argument: ${JSON.stringify(pkg)}. Skipping.`);
      continue;
    }

    const [, npmName, maybeVersion] = m;

    const version = projectDeps.get(npmName);
    if (!version) {
      logger.warn(`Package not installed: ${JSON.stringify(npmName)}. Skipping.`);
      continue;
    }

    packages.set(npmName, (maybeVersion || (options.next ? 'next' : 'latest')) as VersionRange);
  }

  return packages;
}

function _addPackageGroup(
  tree: Tree,
  packages: Map<string, VersionRange>,
  allDependencies: ReadonlyMap<string, VersionRange>,
  npmPackageJson: NpmRepositoryPackageJson,
  logger: logging.LoggerApi,
): void {
  const maybePackage = packages.get(npmPackageJson.name);
  if (!maybePackage) {
    return;
  }

  const distTags = npmPackageJson['dist-tags'] ?? {};
  let version = maybePackage;
  if (distTags[version]) {
    version = distTags[version] as VersionRange;
  } else if (version === 'next') {
    version = distTags['latest'] as VersionRange;
  } else {
    const packageVersionsNonDeprecated: string[] = [];
    const packageVersionsDeprecated: string[] = [];
    const versions = npmPackageJson.versions ?? {};
    for (const [v, { deprecated }] of Object.entries(versions)) {
      if (deprecated) {
        packageVersionsDeprecated.push(v);
      } else {
        packageVersionsNonDeprecated.push(v);
      }
    }
    version =
      ((semver.maxSatisfying(packageVersionsNonDeprecated, version) ??
        semver.maxSatisfying(packageVersionsDeprecated, version)) as VersionRange | null) ??
      version;
  }

  const versions = npmPackageJson.versions ?? {};
  if (!versions[version]) {
    return;
  }
  const ngUpdateMetadata = versions[version]['ng-update'];
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
        acc[curr] = maybePackage;

        return acc;
      },
      {} as { [name: string]: string },
    );
  } else if (
    typeof packageGroup == 'object' &&
    packageGroup &&
    !Array.isArray(packageGroup) &&
    Object.values(packageGroup).every((x) => typeof x == 'string')
  ) {
    packageGroupNormalized = packageGroup;
  } else {
    logger.warn(`packageGroup metadata of package ${npmPackageJson.name} is malformed. Ignoring.`);

    return;
  }

  for (const [name, value] of Object.entries(packageGroupNormalized)) {
    // Don't override names from the command line.
    // Remove packages that aren't installed.
    if (!packages.has(name) && allDependencies.has(name)) {
      packages.set(name, value as VersionRange);
    }
  }
}

/**
 * Add peer dependencies of packages on the command line to the list of packages to update.
 * We don't do verification of the versions here as this will be done by a later step (and can
 * be ignored by the --force flag).
 * @private
 */
async function _addPeerDependencies(
  tree: Tree,
  packages: Map<string, VersionRange>,
  allDependencies: ReadonlyMap<string, VersionRange>,
  npmPackageJson: NpmRepositoryPackageJson,
  workspaceRoot: string,
  fetchMetadata: (name: string) => Promise<NpmRepositoryPackageJson | null>,
  logger: logging.LoggerApi,
): Promise<void> {
  const maybePackage = packages.get(npmPackageJson.name);
  if (!maybePackage) {
    return;
  }
  const distTags = npmPackageJson['dist-tags'] ?? {};
  const version = distTags[maybePackage] || maybePackage;
  const versions = npmPackageJson.versions ?? {};
  const packageJson = versions[version];
  if (!packageJson) {
    return;
  }

  for (const [peer, range] of Object.entries(packageJson.peerDependencies || {})) {
    if (packages.has(peer)) {
      continue;
    }

    const installedVersion = getInstalledVersion(tree, peer, workspaceRoot);
    if (installedVersion) {
      if (semver.satisfies(installedVersion, range)) {
        continue;
      }
    } else {
      const packageJsonRange = allDependencies.get(peer);
      if (packageJsonRange) {
        const peerMetadata = await fetchMetadata(peer);
        if (peerMetadata) {
          const packageVersionsNonDeprecated: string[] = [];
          const packageVersionsDeprecated: string[] = [];
          for (const [v, { deprecated }] of Object.entries(peerMetadata.versions ?? {})) {
            if (deprecated) {
              packageVersionsDeprecated.push(v);
            } else {
              packageVersionsNonDeprecated.push(v);
            }
          }
          const resolvedInstalledVersion =
            semver.maxSatisfying(packageVersionsNonDeprecated, packageJsonRange) ??
            semver.maxSatisfying(packageVersionsDeprecated, packageJsonRange);

          if (resolvedInstalledVersion && semver.satisfies(resolvedInstalledVersion, range)) {
            continue;
          }
        }
      }
    }

    packages.set(peer, range as VersionRange);
  }
}

function _getAllDependencies(tree: Tree): Array<readonly [string, VersionRange]> {
  const { dependencies, devDependencies, peerDependencies } = tree.readJson(
    '/package.json',
  ) as PackageManifest;

  return [
    ...(Object.entries(peerDependencies || {}) as Array<[string, VersionRange]>),
    ...(Object.entries(devDependencies || {}) as Array<[string, VersionRange]>),
    ...(Object.entries(dependencies || {}) as Array<[string, VersionRange]>),
  ];
}

function _formatVersion(version: string | undefined) {
  if (version === undefined) {
    return undefined;
  }

  if (!version.match(/^\d{1,30}\.\d{1,30}\.\d{1,30}/)) {
    version += '.0';
  }
  if (!version.match(/^\d{1,30}\.\d{1,30}\.\d{1,30}/)) {
    version += '.0';
  }
  if (!semver.valid(version)) {
    throw new SchematicsException(`Invalid migration version: ${JSON.stringify(version)}`);
  }

  return version;
}

/**
 * Returns whether or not the given package specifier (the value string in a
 * `package.json` dependency) is hosted in the NPM registry.
 * @throws When the specifier cannot be parsed.
 */
function isPkgFromRegistry(name: string, specifier: string): boolean {
  const result = npa.resolve(name, specifier);

  return !!result.registry;
}

export default function (options: UpdateSchema): Rule {
  if (!options.packages) {
    // We cannot just return this because we need to fetch the packages from NPM still for the
    // help/guide to show.
    options.packages = [];
  } else {
    // We split every packages by commas to allow people to pass in multiple and make it an array.
    options.packages = options.packages.reduce((acc, curr) => {
      return acc.concat(curr.split(','));
    }, [] as string[]);
  }

  if (options.migrateOnly && options.from) {
    if (options.packages.length !== 1) {
      throw new SchematicsException('--from requires that only a single package be passed.');
    }
  }

  options.from = _formatVersion(options.from);
  options.to = _formatVersion(options.to);
  const usingYarn = options.packageManager === 'yarn';

  return async (tree: Tree, context: SchematicContext) => {
    const logger = context.logger;
    const npmDeps = new Map(
      _getAllDependencies(tree).filter(([name, specifier]) => {
        try {
          return isPkgFromRegistry(name, specifier);
        } catch {
          logger.warn(`Package ${name} was not found on the registry. Skipping.`);

          return false;
        }
      }),
    );
    const packages = _buildPackageList(options, npmDeps, logger);

    const workspaceRoot = options.workspaceRoot ?? process.cwd();
    const npmPackageJsonMap = new Map<string, NpmRepositoryPackageJson>();

    const getOrFetchPackageMetadata = async (
      packageName: string,
    ): Promise<NpmRepositoryPackageJson | null> => {
      let metadata = npmPackageJsonMap.get(packageName);
      if (!metadata) {
        const raw = await getNpmPackageJson(packageName, logger, {
          registry: options.registry,
          usingYarn,
          verbose: options.verbose,
        });
        if (raw.name) {
          metadata = raw as NpmRepositoryPackageJson;
          npmPackageJsonMap.set(packageName, metadata);
        }
      }

      return metadata ?? null;
    };

    if (packages.size === 0) {
      // User ran just `ng update` to see the outdated package list.
      // We must fetch metadata for all npm dependencies to generate the usage message.
      await Promise.all(
        Array.from(npmDeps.keys()).map(async (depName) => {
          await getOrFetchPackageMetadata(depName);
        }),
      );
    } else {
      // User requested updates. We resolve dependencies lazily.
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
              const resolvedVersion = resolvePackageVersion(metadata, spec, !!options.next);
              if (resolvedVersion) {
                packages.set(name, resolvedVersion as VersionRange);
              }
              _addPackageGroup(tree, packages, npmDeps, metadata, logger);
            }
          }
        } while (packages.size > lastGroupSize);

        for (const name of Array.from(packages.keys())) {
          const metadata = await getOrFetchPackageMetadata(name);
          const spec = packages.get(name);
          if (metadata && spec) {
            const resolvedVersion = resolvePackageVersion(metadata, spec, !!options.next);
            if (resolvedVersion) {
              packages.set(name, resolvedVersion as VersionRange);
            }
            await _addPeerDependencies(
              tree,
              packages,
              npmDeps,
              metadata,
              workspaceRoot,
              getOrFetchPackageMetadata,
              logger,
            );
          }
        }
      } while (packages.size > lastPackagesSize);
    }

    // Build the PackageInfo for each module.
    const packageInfoMap = new Map<string, PackageInfo>();
    for (const depName of npmDeps.keys()) {
      const isUpdating = packages.has(depName);
      const localPkgJson = getInstalledPackageJson(tree, depName, workspaceRoot);

      if (isUpdating || !localPkgJson) {
        // If updating OR not installed locally, resolve via registry metadata
        const metadata = await getOrFetchPackageMetadata(depName);
        if (metadata) {
          packageInfoMap.set(
            depName,
            _buildPackageInfo(tree, packages, npmDeps, metadata, workspaceRoot, logger),
          );
        } else {
          // Fallback if metadata could not be fetched
          packageInfoMap.set(
            depName,
            _buildLocalPackageInfo(tree, depName, npmDeps, workspaceRoot, logger),
          );
        }
      } else {
        // If not updating and installed locally, resolve purely locally
        packageInfoMap.set(
          depName,
          _buildLocalPackageInfo(tree, depName, npmDeps, workspaceRoot, logger),
        );
      }
    }

    // Now that we have all the information, check the flags.
    if (packages.size > 0) {
      if (options.migrateOnly && options.from && options.packages) {
        return;
      }

      const sublog = new logging.LevelCapLogger('validation', logger.createChild(''), 'warn');
      _validateUpdatePackages(packageInfoMap, !!options.force, !!options.next, sublog);

      _performUpdate(tree, context, packageInfoMap, logger, !!options.migrateOnly);
    } else {
      _usageMessage(options, packageInfoMap, logger);
    }
  };
}
