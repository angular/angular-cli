/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * Script that builds the release output of all packages which have the "release-package
 * Bazel tag set. The script builds all those packages and copies the release output to the
 * distribution folder within the project.
 */

import { BuiltPackage } from '@angular/ng-dev';
import { execSync } from 'node:child_process';
import { chmodSync, copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import sh from 'shelljs';

/** Name of the Bazel tag that will be used to find release package targets. */
const releaseTargetTag = 'release-package';

/** Path to the project directory. */
const projectDir = join(import.meta.dirname, '../');

/** Command that runs Bazel. */
const bazelCmd = process.env.BAZEL || `pnpm -s bazel`;

/** Command that queries Bazel for all release package targets. */
const queryPackagesCmd =
  `${bazelCmd} query --output=label "attr('tags', '\\[.*${releaseTargetTag}.*\\]', //packages/...) ` +
  `intersect kind('ng_package|pkg_npm|^_npm_package rule$', //packages/...)"`;

/** Path for the default distribution output directory. */
const defaultDistPath = join(projectDir, 'dist/releases');

/** Builds the release packages for NPM. */
export function performNpmReleaseBuild(): BuiltPackage[] {
  return buildReleasePackages(defaultDistPath, /* config */ 'release');
}

/**
 * Builds the release packages as snapshot build. This means that the current
 * Git HEAD SHA is included in the version (for easier debugging and back tracing).
 */
export function performDefaultSnapshotBuild(): BuiltPackage[] {
  return buildReleasePackages(defaultDistPath, /* config */ 'snapshot');
}

export function performLocalPackageBuild(): BuiltPackage[] {
  return buildReleasePackages(defaultDistPath, /* config */ 'local');
}

/**
 * Builds the release packages with the given compile mode and copies
 * the package output into the given directory.
 */
function buildReleasePackages(
  distPath: string,
  config: 'release' | 'snapshot' | 'local',
): BuiltPackage[] {
  console.log('######################################');
  console.log(`  Building ${config} packages...`);
  console.log('######################################');

  // List of targets to build. e.g. "packages/angular/cli:npm_package"
  const targets = exec(queryPackagesCmd, true).split(/\r?\n/);
  const packageNames = getPackageNamesOfTargets(targets);
  const bazelBinPath = exec(`${bazelCmd} info bazel-bin`, true);
  const getBazelOutputPath = (pkgName: string) =>
    join(bazelBinPath, 'packages', pkgName, 'npm_package');
  const getDistPath = (pkgName: string) => join(distPath, pkgName);

  // Build with "--config=release" or `--config=snapshot` so that Bazel
  // runs the workspace stamping script. The stamping script ensures that the
  // version placeholder is populated in the release output.
  if (!['release', 'snapshot', 'local'].includes(config)) {
    throw new Error('Invalid config value: ' + config);
  }
  const stampConfigArg = `--config=${config}`;

  // Walk through each release package and clear previous "npm_package" outputs. This is
  // a workaround for: https://github.com/bazelbuild/rules_nodejs/issues/1219. We need to
  // do this to ensure that the version placeholders are properly populated.
  packageNames.forEach((pkgName) => {
    // Directory output is created by the npm_package target
    const directoryOutputPath = getBazelOutputPath(pkgName);
    // Archive output is created by the npm_package_archive target
    const archiveOutputPath = directoryOutputPath + '_archive.tgz';

    if (sh.test('-d', directoryOutputPath)) {
      sh.chmod('-R', 'u+w', directoryOutputPath);
      sh.rm('-rf', directoryOutputPath);
    }
    try {
      chmodSync(archiveOutputPath, '0755');
      rmSync(archiveOutputPath, { force: true });
    } catch {}
  });

  // Build both the npm_package and npm_package_archive targets for each package
  // TODO: Consider switching to only using the archive for publishing
  const buildTargets = targets.flatMap((target) => [target, target + '_archive']);
  exec(`${bazelCmd} build ${stampConfigArg} ${buildTargets.join(' ')}`);

  // Delete the distribution directory so that the output is guaranteed to be clean. Re-create
  // the empty directory so that we can copy the release packages into it later.
  rmSync(distPath, { force: true, recursive: true, maxRetries: 3 });
  mkdirSync(distPath, { recursive: true });

  // Copy the package output into the specified distribution folder.
  packageNames.forEach((pkgName) => {
    // Directory output is created by the npm_package target
    const directoryOutputPath = getBazelOutputPath(pkgName);
    // Archive output is created by the npm_package_archive target
    const archiveOutputPath = directoryOutputPath + '_archive.tgz';

    const targetFolder = getDistPath(pkgName);
    console.log(`> Copying package output to "${targetFolder}"`);

    // Ensure package scope directory exists prior to copying
    mkdirSync(dirname(targetFolder), { recursive: true });

    // Copy package contents to target directory
    sh.cp('-R', directoryOutputPath, targetFolder);
    sh.chmod('-R', 'u+w', targetFolder);

    // Copy archive of package to target directory
    const archiveTargetPath = join(distPath, `${pkgName.replace('/', '_')}.tgz`);
    copyFileSync(archiveOutputPath, archiveTargetPath);
    chmodSync(archiveTargetPath, '0755');
  });

  return packageNames.map((pkg) => {
    return {
      // Package names on disk do not have the @ scope prefix and use underscores instead of dashes
      name: `@${pkg.replace(/_/g, '-')}`,
      outputPath: getDistPath(pkg),
    };
  });
}

/**
 * Gets the package names of the specified Bazel targets.
 * e.g. //packages/angular/cli:npm_package = angular/cli
 */
function getPackageNamesOfTargets(targets: string[]): string[] {
  return targets.map((targetName) => {
    const matches = targetName.match(/\/\/packages\/(.*?):/);
    if (matches === null) {
      throw Error(
        `Found Bazel target with "${releaseTargetTag}" tag, but could not ` +
          `determine release output name: ${targetName}`,
      );
    }

    return matches[1];
  });
}

/** Executes the given command in the project directory. */
function exec(command: string): void;

/** Executes the given command in the project directory and returns its stdout. */
function exec(command: string, captureStdout: true): string;
function exec(command: string, captureStdout?: true) {
  const stdout = execSync(command, {
    cwd: projectDir,
    stdio: ['inherit', captureStdout ? 'pipe' : 'inherit', 'inherit'],
  });

  if (captureStdout) {
    process.stdout.write(stdout);

    return stdout.toString().trim();
  }
}
//json.stringify
