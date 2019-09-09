/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { logging, tags } from '@angular-devkit/core';
import {
  Rule,
  SchematicContext,
  SchematicsException,
  TaskId,
  Tree,
} from '@angular-devkit/schematics';
import { NodePackageInstallTask, RunSchematicTask } from '@angular-devkit/schematics/tasks';
import { Observable, from as observableFrom, of } from 'rxjs';
import { map, mergeMap, reduce, switchMap } from 'rxjs/operators';
import * as semver from 'semver';
import { getNpmPackageJson } from './npm';
import { NpmRepositoryPackageJson } from './npm-package-json';
import { Dependency, JsonSchemaForNpmPackageJsonFiles } from './package-json';
import { Schema as UpdateSchema } from './schema';

type VersionRange = string & { __VERSION_RANGE: void; };
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
const peerCompatibleWhitelist: { [name: string]: PeerVersionTransform } = {
  '@angular/core': angularMajorCompatGuarantee,
};

interface PackageVersionInfo {
  version: VersionRange;
  packageJson: JsonSchemaForNpmPackageJsonFiles;
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
  packageGroup: { [ packageName: string ]: string };
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

  const maybeTransform = peerCompatibleWhitelist[name];
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
  peers: {[name: string]: string},
  logger: logging.LoggerApi,
): boolean {
  for (const [peer, range] of Object.entries(peers)) {
    logger.debug(`Checking forward peer ${peer}...`);
    const maybePeerInfo = infoMap.get(peer);
    if (!maybePeerInfo) {
      logger.error([
        `Package ${JSON.stringify(name)} has a missing peer dependency of`,
        `${JSON.stringify(peer)} @ ${JSON.stringify(range)}.`,
      ].join(' '));

      return true;
    }

    const peerVersion = maybePeerInfo.target && maybePeerInfo.target.packageJson.version
      ? maybePeerInfo.target.packageJson.version
      : maybePeerInfo.installed.version;

    logger.debug(`  Range intersects(${range}, ${peerVersion})...`);
    if (!semver.satisfies(peerVersion, range)) {
      logger.error([
        `Package ${JSON.stringify(name)} has an incompatible peer dependency to`,
        `${JSON.stringify(peer)} (requires ${JSON.stringify(range)},`,
        `would install ${JSON.stringify(peerVersion)})`,
      ].join(' '));

      return true;
    }
  }

  return false;
}


function _validateReversePeerDependencies(
  name: string,
  version: string,
  infoMap: Map<string, PackageInfo>,
  logger: logging.LoggerApi,
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

      // Override the peer version range if it's whitelisted.
      const extendedRange = _updatePeerVersion(infoMap, peer, range);

      if (!semver.satisfies(version, extendedRange)) {
        logger.error([
          `Package ${JSON.stringify(installed)} has an incompatible peer dependency to`,
          `${JSON.stringify(name)} (requires`,
          `${JSON.stringify(range)}${extendedRange == range ? '' : ' (extended)'},`,
          `would install ${JSON.stringify(version)}).`,
        ].join(' '));

        return true;
      }
    }
  }

  return false;
}

function _validateUpdatePackages(
  infoMap: Map<string, PackageInfo>,
  force: boolean,
  logger: logging.LoggerApi,
): void {
  logger.debug('Updating the following packages:');
  infoMap.forEach(info => {
    if (info.target) {
      logger.debug(`  ${info.name} => ${info.target.version}`);
    }
  });

  let peerErrors = false;
  infoMap.forEach(info => {
    const {name, target} = info;
    if (!target) {
      return;
    }

    const pkgLogger = logger.createChild(name);
    logger.debug(`${name}...`);

    const peers = target.packageJson.peerDependencies || {};
    peerErrors = _validateForwardPeerDependencies(name, infoMap, peers, pkgLogger) || peerErrors;
    peerErrors
      = _validateReversePeerDependencies(name, target.version, infoMap, pkgLogger)
      || peerErrors;
  });

  if (!force && peerErrors) {
    throw new SchematicsException(tags.stripIndents
      `Incompatible peer dependencies found.
      Peer dependency warnings when installing dependencies means that those dependencies might not work correctly together.
      You can use the '--force' option to ignore incompatible peer dependencies and instead address these warnings later.`);
  }
}


function _performUpdate(
  tree: Tree,
  context: SchematicContext,
  infoMap: Map<string, PackageInfo>,
  logger: logging.LoggerApi,
  migrateOnly: boolean,
): Observable<void> {
  const packageJsonContent = tree.read('/package.json');
  if (!packageJsonContent) {
    throw new SchematicsException('Could not find a package.json. Are you in a Node project?');
  }

  let packageJson: JsonSchemaForNpmPackageJsonFiles;
  try {
    packageJson = JSON.parse(packageJsonContent.toString()) as JsonSchemaForNpmPackageJsonFiles;
  } catch (e) {
    throw new SchematicsException('package.json could not be parsed: ' + e.message);
  }

  const updateDependency = (deps: Dependency, name: string, newVersion: string) => {
    const oldVersion = deps[name];
    // We only respect caret and tilde ranges on update.
    const execResult = /^[\^~]/.exec(oldVersion);
    deps[name] = `${execResult ? execResult[0] : ''}${newVersion}`;
  };

  const toInstall = [...infoMap.values()]
      .map(x => [x.name, x.target, x.installed])
      // tslint:disable-next-line:no-non-null-assertion
      .filter(([name, target, installed]) => {
        return !!name && !!target && !!installed;
      }) as [string, PackageVersionInfo, PackageVersionInfo][];

  toInstall.forEach(([name, target, installed]) => {
    logger.info(
      `Updating package.json with dependency ${name} `
      + `@ ${JSON.stringify(target.version)} (was ${JSON.stringify(installed.version)})...`,
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

  const newContent = JSON.stringify(packageJson, null, 2);
  if (packageJsonContent.toString() != newContent || migrateOnly) {
    let installTask: TaskId[] = [];
    if (!migrateOnly) {
      // If something changed, also hook up the task.
      tree.overwrite('/package.json', JSON.stringify(packageJson, null, 2));
      installTask = [context.addTask(new NodePackageInstallTask())];
    }

    // Run the migrate schematics with the list of packages to use. The collection contains
    // version information and we need to do this post installation. Please note that the
    // migration COULD fail and leave side effects on disk.
    // Run the schematics task of those packages.
    toInstall.forEach(([name, target, installed]) => {
      if (!target.updateMetadata.migrations) {
        return;
      }

      const collection = (
        target.updateMetadata.migrations.match(/^[./]/)
        ? name + '/'
        : ''
      ) + target.updateMetadata.migrations;

      context.addTask(new RunSchematicTask('@schematics/update', 'migrate', {
          package: name,
          collection,
          from: installed.version,
          to: target.version,
        }),
        installTask,
      );
    });
  }

  return of<void>(undefined);
}

function _migrateOnly(
  info: PackageInfo | undefined,
  context: SchematicContext,
  from: string,
  to?: string,
) {
  if (!info) {
    return of<void>();
  }

  const target = info.installed;
  if (!target || !target.updateMetadata.migrations) {
    return of<void>(undefined);
  }

  const collection = (
    target.updateMetadata.migrations.match(/^[./]/)
      ? info.name + '/'
      : ''
  ) + target.updateMetadata.migrations;

  context.addTask(new RunSchematicTask('@schematics/update', 'migrate', {
      package: info.name,
      collection,
      from: from,
      to: to || target.version,
    }),
  );

  return of<void>(undefined);
}

function _getUpdateMetadata(
  packageJson: JsonSchemaForNpmPackageJsonFiles,
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
    if (Array.isArray(packageGroup) && packageGroup.every(x => typeof x == 'string')) {
      result.packageGroup = packageGroup.reduce((group, name) => {
        group[name] = packageJson.version;

        return group;
      }, result.packageGroup);
    } else if (typeof packageGroup == 'object' && packageGroup
               && Object.values(packageGroup).every(x => typeof x == 'string')) {
      result.packageGroup = packageGroup;
    } else {
      logger.warn(
        `packageGroup metadata of package ${packageJson.name} is malformed. Ignoring.`,
      );
    }

    result.packageGroupName = Object.keys(result.packageGroup)[0];
  }

  if (typeof metadata['packageGroupName'] == 'string') {
    result.packageGroupName = metadata['packageGroupName'];
  }

  if (metadata['requirements']) {
    const requirements = metadata['requirements'];
    // Verify that requirements are
    if (typeof requirements != 'object'
        || Array.isArray(requirements)
        || Object.keys(requirements).some(name => typeof requirements[name] != 'string')) {
      logger.warn(
        `requirements metadata of package ${packageJson.name} is malformed. Ignoring.`,
      );
    } else {
      result.requirements = requirements;
    }
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
      const tag = options.next
        ? (info.npmPackageJson['dist-tags']['next'] ? 'next' : 'latest') : 'latest';
      const version = info.npmPackageJson['dist-tags'][tag];
      const target = info.npmPackageJson.versions[version];

      return {
        name,
        info,
        version,
        tag,
        target,
      };
    })
    .filter(({ name, info, version, target }) => {
      return (target && semver.compare(info.installed.version, version) < 0);
    })
    .filter(({ target }) => {
      return target['ng-update'];
    })
    .map(({ name, info, version, tag, target }) => {
      // Look for packageGroup.
      if (target['ng-update'] && target['ng-update']['packageGroup']) {
        const packageGroup = target['ng-update']['packageGroup'];
        const packageGroupName = target['ng-update']['packageGroupName']
                              || target['ng-update']['packageGroup'][0];
        if (packageGroupName) {
          if (packageGroups.has(name)) {
            return null;
          }

          packageGroup.forEach((x: string) => packageGroups.set(x, packageGroupName));
          packageGroups.set(packageGroupName, packageGroupName);
          name = packageGroupName;
        }
      }

      let command = `ng update ${name}`;
      if (tag == 'next') {
        command += ' --next';
      }

      return [name, `${info.installed.version} -> ${version}`, command];
    })
    .filter(x => x !== null)
    .sort((a, b) => a && b ? a[0].localeCompare(b[0]) : 0);

  if (packagesToUpdate.length == 0) {
    logger.info('We analyzed your package.json and everything seems to be in order. Good work!');

    return of<void>(undefined);
  }

  logger.info(
    'We analyzed your package.json, there are some packages to update:\n',
  );

  // Find the largest name to know the padding needed.
  let namePad = Math.max(...[...infoMap.keys()].map(x => x.length)) + 2;
  if (!Number.isFinite(namePad)) {
    namePad = 30;
  }
  const pads = [namePad, 25, 0];

  logger.info(
    '  '
    + ['Name', 'Version', 'Command to update'].map((x, i) => x.padEnd(pads[i])).join(''),
  );
  logger.info(' ' + '-'.repeat(pads.reduce((s, x) => s += x, 0) + 20));

  packagesToUpdate.forEach(fields => {
    if (!fields) {
      return;
    }

    logger.info('  ' + fields.map((x, i) => x.padEnd(pads[i])).join(''));
  });

  return of<void>(undefined);
}


function _buildPackageInfo(
  tree: Tree,
  packages: Map<string, VersionRange>,
  allDependencies: ReadonlyMap<string, VersionRange>,
  npmPackageJson: NpmRepositoryPackageJson,
  logger: logging.LoggerApi,
): PackageInfo {
  const name = npmPackageJson.name;
  const packageJsonRange = allDependencies.get(name);
  if (!packageJsonRange) {
    throw new SchematicsException(
      `Package ${JSON.stringify(name)} was not found in package.json.`,
    );
  }

  // Find out the currently installed version. Either from the package.json or the node_modules/
  // TODO: figure out a way to read package-lock.json and/or yarn.lock.
  let installedVersion: string | undefined | null;
  const packageContent = tree.read(`/node_modules/${name}/package.json`);
  if (packageContent) {
    const content = JSON.parse(packageContent.toString()) as JsonSchemaForNpmPackageJsonFiles;
    installedVersion = content.version;
  }
  if (!installedVersion) {
    // Find the version from NPM that fits the range to max.
    installedVersion = semver.maxSatisfying(
      Object.keys(npmPackageJson.versions),
      packageJsonRange,
    );
  }

  if (!installedVersion) {
    throw new SchematicsException(
      `An unexpected error happened; could not determine version for package ${name}.`,
    );
  }

  const installedPackageJson = npmPackageJson.versions[installedVersion] || packageContent;
  if (!installedPackageJson) {
    throw new SchematicsException(
      `An unexpected error happened; package ${name} has no version ${installedVersion}.`,
    );
  }

  let targetVersion: VersionRange | undefined = packages.get(name);
  if (targetVersion) {
    if (npmPackageJson['dist-tags'][targetVersion]) {
      targetVersion = npmPackageJson['dist-tags'][targetVersion] as VersionRange;
    } else if (targetVersion == 'next') {
      targetVersion = npmPackageJson['dist-tags']['latest'] as VersionRange;
    } else {
      targetVersion = semver.maxSatisfying(
        Object.keys(npmPackageJson.versions),
        targetVersion,
      ) as VersionRange;
    }
  }

  if (targetVersion && semver.lte(targetVersion, installedVersion)) {
    logger.debug(`Package ${name} already satisfied by package.json (${packageJsonRange}).`);
    targetVersion = undefined;
  }

  const target: PackageVersionInfo | undefined = targetVersion
    ? {
      version: targetVersion,
      packageJson: npmPackageJson.versions[targetVersion],
      updateMetadata: _getUpdateMetadata(npmPackageJson.versions[targetVersion], logger),
    }
    : undefined;

  // Check if there's an installed version.
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
  options: UpdateSchema,
  projectDeps: Map<string, VersionRange>,
  logger: logging.LoggerApi,
): Map<string, VersionRange> {
  // Parse the packages options to set the targeted version.
  const packages = new Map<string, VersionRange>();
  const commandLinePackages =
    (options.packages && options.packages.length > 0)
    ? options.packages
    : (options.all ? projectDeps.keys() : []);

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

    // Verify that people have an actual version in the package.json, otherwise (label or URL or
    // gist or ...) we don't update it.
    if (
      version.startsWith('http:')  // HTTP
      || version.startsWith('file:')  // Local folder
      || version.startsWith('git:')  // GIT url
      || version.match(/^\w{1,100}\/\w{1,100}/)  // GitHub's "user/repo"
      || version.match(/^(?:\.{0,2}\/)\w{1,100}/)  // Local folder, maybe relative.
    ) {
      // We only do that for --all. Otherwise we have the installed version and the user specified
      // it on the command line.
      if (options.all) {
        logger.warn(
          `Package ${JSON.stringify(npmName)} has a custom version: `
          + `${JSON.stringify(version)}. Skipping.`,
        );
        continue;
      }
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

  const info = _buildPackageInfo(tree, packages, allDependencies, npmPackageJson, logger);

  const version = (info.target && info.target.version)
               || npmPackageJson['dist-tags'][maybePackage]
               || maybePackage;
  if (!npmPackageJson.versions[version]) {
    return;
  }
  const ngUpdateMetadata = npmPackageJson.versions[version]['ng-update'];
  if (!ngUpdateMetadata) {
    return;
  }

  let packageGroup = ngUpdateMetadata['packageGroup'];
  if (!packageGroup) {
    return;
  }
  if (Array.isArray(packageGroup) && !packageGroup.some(x => typeof x != 'string')) {
    packageGroup = packageGroup.reduce((acc, curr) => {
      acc[curr] = maybePackage;

      return acc;
    }, {} as { [name: string]: string });
  }

  // Only need to check if it's an object because we set it right the time before.
  if (typeof packageGroup != 'object'
      || packageGroup === null
      || Object.values(packageGroup).some(v => typeof v != 'string')
  ) {
    logger.warn(`packageGroup metadata of package ${npmPackageJson.name} is malformed.`);

    return;
  }

  Object.keys(packageGroup)
    .filter(name => !packages.has(name))  // Don't override names from the command line.
    .filter(name => allDependencies.has(name))  // Remove packages that aren't installed.
    .forEach(name => {
      packages.set(name, packageGroup[name]);
    });
}

/**
 * Add peer dependencies of packages on the command line to the list of packages to update.
 * We don't do verification of the versions here as this will be done by a later step (and can
 * be ignored by the --force flag).
 * @private
 */
function _addPeerDependencies(
  tree: Tree,
  packages: Map<string, VersionRange>,
  allDependencies: ReadonlyMap<string, VersionRange>,
  npmPackageJson: NpmRepositoryPackageJson,
  npmPackageJsonMap: Map<string, NpmRepositoryPackageJson>,
  logger: logging.LoggerApi,
): void {
  const maybePackage = packages.get(npmPackageJson.name);
  if (!maybePackage) {
    return;
  }

  const info = _buildPackageInfo(tree, packages, allDependencies, npmPackageJson, logger);

  const version = (info.target && info.target.version)
               || npmPackageJson['dist-tags'][maybePackage]
               || maybePackage;
  if (!npmPackageJson.versions[version]) {
    return;
  }

  const packageJson = npmPackageJson.versions[version];
  const error = false;

  for (const [peer, range] of Object.entries(packageJson.peerDependencies || {})) {
    if (packages.has(peer)) {
      continue;
    }

    const peerPackageJson = npmPackageJsonMap.get(peer);
    if (peerPackageJson) {
      const peerInfo = _buildPackageInfo(tree, packages, allDependencies, peerPackageJson, logger);
      if (semver.satisfies(peerInfo.installed.version, range)) {
        continue;
      }
    }

    packages.set(peer, range as VersionRange);
  }

  if (error) {
    throw new SchematicsException('An error occured, see above.');
  }
}


function _getAllDependencies(tree: Tree): Map<string, VersionRange> {
  const packageJsonContent = tree.read('/package.json');
  if (!packageJsonContent) {
    throw new SchematicsException('Could not find a package.json. Are you in a Node project?');
  }

  let packageJson: JsonSchemaForNpmPackageJsonFiles;
  try {
    packageJson = JSON.parse(packageJsonContent.toString()) as JsonSchemaForNpmPackageJsonFiles;
  } catch (e) {
    throw new SchematicsException('package.json could not be parsed: ' + e.message);
  }

  return new Map<string, VersionRange>([
    ...Object.entries(packageJson.peerDependencies || {}),
    ...Object.entries(packageJson.devDependencies || {}),
    ...Object.entries(packageJson.dependencies || {}),
  ] as [string, VersionRange][]);
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


export default function(options: UpdateSchema): Rule {
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

  return (tree: Tree, context: SchematicContext) => {
    const logger = context.logger;
    const allDependencies = _getAllDependencies(tree);
    const packages = _buildPackageList(options, allDependencies, logger);
    const usingYarn = options.packageManager === 'yarn';

    return observableFrom([...allDependencies.keys()]).pipe(
      // Grab all package.json from the npm repository. This requires a lot of HTTP calls so we
      // try to parallelize as many as possible.
      mergeMap(depName => getNpmPackageJson(
        depName,
        logger,
        { registryUrl: options.registry, usingYarn, verbose: options.verbose },
      )),

      // Build a map of all dependencies and their packageJson.
      reduce<NpmRepositoryPackageJson, Map<string, NpmRepositoryPackageJson>>(
        (acc, npmPackageJson) => {
          // If the package was not found on the registry. It could be private, so we will just
          // ignore. If the package was part of the list, we will error out, but will simply ignore
          // if it's either not requested (so just part of package.json. silently) or if it's a
          // `--all` situation. There is an edge case here where a public package peer depends on a
          // private one, but it's rare enough.
          if (!npmPackageJson.name) {
            if (packages.has(npmPackageJson.requestedName)) {
              if (options.all) {
                logger.warn(`Package ${JSON.stringify(npmPackageJson.requestedName)} was not `
                  + 'found on the registry. Skipping.');
              } else {
                throw new SchematicsException(
                  `Package ${JSON.stringify(npmPackageJson.requestedName)} was not found on the `
                  + 'registry. Cannot continue as this may be an error.');
              }
            }
          } else {
            acc.set(npmPackageJson.name, npmPackageJson);
          }

          return acc;
        },
        new Map<string, NpmRepositoryPackageJson>(),
      ),

      map(npmPackageJsonMap => {
        // Augment the command line package list with packageGroups and forward peer dependencies.
        // Each added package may uncover new package groups and peer dependencies, so we must
        // repeat this process until the package list stabilizes.
        let lastPackagesSize;
        do {
          lastPackagesSize = packages.size;
          npmPackageJsonMap.forEach((npmPackageJson) => {
            _addPackageGroup(tree, packages, allDependencies, npmPackageJson, logger);
            _addPeerDependencies(tree, packages, allDependencies, npmPackageJson, npmPackageJsonMap, logger);
          });
        } while (packages.size > lastPackagesSize);

        // Build the PackageInfo for each module.
        const packageInfoMap = new Map<string, PackageInfo>();
        npmPackageJsonMap.forEach((npmPackageJson) => {
          packageInfoMap.set(
            npmPackageJson.name,
            _buildPackageInfo(tree, packages, allDependencies, npmPackageJson, logger),
          );
        });

        return packageInfoMap;
      }),

      switchMap(infoMap => {
        // Now that we have all the information, check the flags.
        if (packages.size > 0) {
          if (options.migrateOnly && options.from && options.packages) {
            return _migrateOnly(
              infoMap.get(options.packages[0]),
              context,
              options.from,
              options.to,
            );
          }

          const sublog = new logging.LevelCapLogger(
            'validation',
            logger.createChild(''),
            'warn',
          );
          _validateUpdatePackages(infoMap, !!options.force, sublog);

          return _performUpdate(tree, context, infoMap, logger, !!options.migrateOnly);
        } else {
          return _usageMessage(options, infoMap, logger);
        }
      }),

      switchMap(() => of(tree)),
    );
  };
}
