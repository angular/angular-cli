/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonObject, logging } from '@angular-devkit/core';
import {
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
  chain,
} from '@angular-devkit/schematics';
import * as http from 'http';
import { Observable } from 'rxjs/Observable';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { concat, ignoreElements, map, mergeMap } from 'rxjs/operators';
import * as semver from 'semver';

const semverIntersect = require('semver-intersect');

const kPackageJsonDependencyFields = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
];


const npmPackageJsonCache = new Map<string, Observable<JsonObject>>();

function _getVersionFromNpmPackage(json: JsonObject, version: string, loose: boolean): string {
  const distTags = json['dist-tags'] as JsonObject;
  if (distTags && distTags[version]) {
    return (loose ? '^' : '') + distTags[version] as string;
  } else {
    if (!semver.validRange(version)) {
      throw new SchematicsException(`Invalid range or version: "${version}".`);
    }
    if (semver.valid(version) && loose) {
      version = '~' + version;
    }

    const packageVersions = Object.keys(json['versions'] as JsonObject);
    const maybeMatch = semver.maxSatisfying(packageVersions, version);

    if (!maybeMatch) {
      throw new SchematicsException(
        `Version "${version}" has no satisfying version for package ${json['name']}`,
      );
    }

    const maybeOperator = version.match(/^[~^]/);
    if (version == '*') {
      return maybeMatch;
    } else if (maybeOperator) {
      return maybeOperator[0] + maybeMatch;
    } else {
      return (loose ? '~' : '') + maybeMatch;
    }
  }
}

/**
 * Get the NPM repository's package.json for a package. This is p
 * @param {string} packageName The package name to fetch.
 * @param {LoggerApi} logger A logger instance to log debug information.
 * @returns {Observable<JsonObject>} An observable that will put the pacakge.json content.
 * @private
 */
function _getNpmPackageJson(
  packageName: string,
  logger: logging.LoggerApi,
): Observable<JsonObject> {
  const url = `http://registry.npmjs.org/${packageName.replace(/\//g, '%2F')}`;
  logger.debug(`Getting package.json from ${JSON.stringify(packageName)}...`);

  let maybeRequest = npmPackageJsonCache.get(url);
  if (!maybeRequest) {
    const subject = new ReplaySubject<JsonObject>(1);

    const request = http.request(url, response => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          const json = JSON.parse(data);
          subject.next(json as JsonObject);
          subject.complete();
        } catch (err) {
          subject.error(err);
        }
      });
      response.on('error', err => subject.error(err));
    });
    request.end();

    maybeRequest = subject.asObservable();
    npmPackageJsonCache.set(url, maybeRequest);
  }

  return maybeRequest;
}

/**
 * Recursively get versions of packages to update to, along with peer dependencies. Only recurse
 * peer dependencies and only update versions of packages that are in the original package.json.
 * @param {JsonObject} packageJson The original package.json to update.
 * @param {{[p: string]: string}} packages
 * @param {{[p: string]: string}} allVersions
 * @param {LoggerApi} logger
 * @param {boolean} loose
 * @returns {Observable<void>}
 * @private
 */
function _getRecursiveVersions(
  packageJson: JsonObject,
  packages: { [name: string]: string },
  allVersions: { [name: string]: string },
  logger: logging.LoggerApi,
  loose: boolean,
): Observable<void> {
  return Observable.from(kPackageJsonDependencyFields).pipe(
    mergeMap(field => {
      const deps = packageJson[field] as JsonObject;
      if (deps) {
        return Observable.from(
          Object.keys(deps)
            .map(depName => depName in deps ? [depName, deps[depName]] : null)
            .filter(x => !!x),
        );
      } else {
        return Observable.empty();
      }
    }),
    mergeMap(([depName, depVersion]: [string, string]) => {
      if (!packages[depName] || packages[depName] === depVersion) {
        return Observable.empty();
      }
      if (allVersions[depName] && semver.intersects(allVersions[depName], depVersion)) {
        allVersions[depName] = semverIntersect.intersect(allVersions[depName], depVersion);

        return Observable.empty();
      }

      return _getNpmPackageJson(depName, logger).pipe(
        map(json => [packages[depName], depName, depVersion, json]),
      );
    }),
    mergeMap(([version, depName, depVersion, npmPackageJson]) => {
      const updateVersion = _getVersionFromNpmPackage(npmPackageJson, version, loose);
      const npmPackageVersions = Object.keys(npmPackageJson['versions'] as JsonObject);
      const match = semver.maxSatisfying(npmPackageVersions, updateVersion);
      if (!match) {
        return Observable.empty();
      }
      if (semver.lt(
        semverIntersect.parseRange(updateVersion).version,
        semverIntersect.parseRange(depVersion).version)
      ) {
        throw new SchematicsException(`Cannot downgrade package ${
          JSON.stringify(depName)} from version "${depVersion}" to "${updateVersion}".`,
        );
      }

      const innerNpmPackageJson = (npmPackageJson['versions'] as JsonObject)[match] as JsonObject;
      const dependencies: { [name: string]: string } = {};

      const deps = innerNpmPackageJson['peerDependencies'] as JsonObject;
      if (deps) {
        for (const depName of Object.keys(deps)) {
          dependencies[depName] = deps[depName] as string;
        }
      }

      logger.debug(`Recording update for ${JSON.stringify(depName)} to version ${updateVersion}.`);

      if (allVersions[depName]) {
        if (!semver.intersects(allVersions[depName], updateVersion)) {
          throw new SchematicsException(
            'Cannot update safely because packages have conflicting dependencies. Package '
            + `${depName} would need to match both versions "${updateVersion}" and `
            + `"${allVersions[depName]}, which are not compatible.`,
          );
        }

        allVersions[depName] = semverIntersect.intersect(allVersions[depName], updateVersion);
      } else {
        allVersions[depName] = updateVersion;
      }

      return _getRecursiveVersions(
        packageJson,
        dependencies,
        allVersions,
        logger,
        loose,
      );
    }),
  );
}

/**
 * Use a Rule which can return an observable, but do not actually modify the Tree.
 * This rules perform an HTTP request to get the npm registry package.json, then resolve the
 * version from the options, and replace the version in the options by an actual version.
 * @param supportedPackages A list of packages to update (at the same version).
 * @param maybeVersion A version to update those packages to.
 * @param loose Whether to use loose version operators (instead of specific versions).
 * @private
 */
export function updatePackageJson(
  supportedPackages: string[],
  maybeVersion = 'latest',
  loose = false,
): Rule {
  const version = maybeVersion ? maybeVersion : 'latest';
  // This will be updated as we read the NPM repository.
  const allVersions: { [name: string]: string} = {};

  return chain([
    (tree: Tree, context: SchematicContext): Observable<Tree> => {
      const packageJsonContent = tree.read('/package.json');
      if (!packageJsonContent) {
        throw new SchematicsException('Could not find package.json.');
      }
      const packageJson = JSON.parse(packageJsonContent.toString());
      const packages: { [name: string]: string } = {};
      for (const name of supportedPackages) {
        packages[name] = version;
      }

      return _getRecursiveVersions(packageJson, packages, allVersions, context.logger, loose).pipe(
        ignoreElements(),
        concat(Observable.of(tree)),
        map(_ => tree),  // Just to get the TypeScript typesystem fixed.
      );
    },
    (tree: Tree) => {
      const packageJsonContent = tree.read('/package.json');
      if (!packageJsonContent) {
        throw new SchematicsException('Could not find package.json.');
      }
      const packageJson = JSON.parse(packageJsonContent.toString());

      for (const field of kPackageJsonDependencyFields) {
        const deps = packageJson[field];
        if (!deps) {
          continue;
        }

        for (const depName of Object.keys(packageJson[field])) {
          if (allVersions[depName]) {
            packageJson[field][depName] = allVersions[depName];
          }
        }
      }

      tree.overwrite('/package.json', JSON.stringify(packageJson, null, 2) + '\n');

      return tree;
    },
  ]);
}
