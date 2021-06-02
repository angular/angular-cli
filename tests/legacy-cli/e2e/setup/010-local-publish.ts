import { getGlobalVariable } from '../utils/env';
import { npm, silentNpm } from '../utils/process';
import { isPrereleaseCli } from '../utils/project';

async function publishLocal(specifier: string, tags: string[], registry: string): Promise<void> {
  const { stdout: stdoutPack1 } = await silentNpm(
    'pack',
    specifier,
    '--registry=https://registry.npmjs.org',
  );
  for (const tag of tags) {
    await silentNpm('publish', stdoutPack1.trim(), `--registry=${registry}`, `--tag=${tag}`);
  }
}

export default async function () {
  const testRegistry = getGlobalVariable('package-registry');
  await npm(
    'run',
    'admin',
    '--',
    'publish',
    '--no-versionCheck',
    '--no-branchCheck',
    `--registry=${testRegistry}`,
    '--tag',
    isPrereleaseCli() ? 'next' : 'latest',
  );

  const basePackages = [
    '@angular/cli',
    '@angular-devkit/architect',
    '@angular-devkit/build-angular',
    '@angular-devkit/build-optimizer',
    '@angular-devkit/build-webpack',
    '@angular-devkit/core',
    '@angular-devkit/schematics',
    '@ngtools/webpack',
    '@schematics/angular',
    '@schematics/update',
  ];

  const ltsVersions = {
    '8': [...basePackages],
    '9': [...basePackages],
    '10': [...basePackages],
  };
  for (const [ltsVersion, ltsPackages] of Object.entries(ltsVersions)) {
    const tag = `v${ltsVersion}-lts`;

    for (const packageName of ltsPackages) {
      await publishLocal(
        `${packageName}@${tag}`,
        [tag],
        testRegistry,
      );
    }
  }

  const v8OriginalPackages = [
    '@angular/cli@8.0',
    '@angular-devkit/architect@0.800',
    '@angular-devkit/build-angular@0.800',
    '@angular-devkit/build-optimizer@0.800',
    '@angular-devkit/build-webpack@0.800',
    '@angular-devkit/core@8.0',
    '@angular-devkit/schematics@8.0',
    '@ngtools/webpack@8.0.6',
    '@schematics/angular@8.0',
    '@schematics/update@0.800',
  ];

  for (const fullPackageSpecifier of v8OriginalPackages) {
    await publishLocal(
      fullPackageSpecifier,
      ['v8-original'],
      testRegistry,
    );
  }
}
