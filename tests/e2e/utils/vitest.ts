import { createRequire } from 'node:module';
import { installWorkspacePackages } from './packages';
import { updateJsonFile } from './project';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/** Updates the `test` builder in the current workspace to use Vitest. */
export async function applyVitestBuilder(options?: {
  coverageV8?: boolean;
  coverageIstanbul?: boolean;
  playwright?: boolean;
  webdriver?: boolean;
}): Promise<void> {
  const { coverageV8, coverageIstanbul, playwright, webdriver } = options ?? {};

  const schematicsAngular = createRequire(process.cwd() + '/').resolve(
    '@schematics/angular/package.json',
  );

  const latestVersionsPath = resolve(schematicsAngular, '../utility/latest-versions/package.json');

  const { dependencies: latestVersion } = JSON.parse(await readFile(latestVersionsPath, 'utf-8'));

  await updateJsonFile('package.json', (json) => {
    json.devDependencies['vitest'] = latestVersion['vitest'];
    json.devDependencies['jsdom'] = latestVersion['jsdom'];

    if (webdriver) {
      json.devDependencies['webdriverio'] = latestVersion['webdriverio'];
      json.devDependencies['@vitest/browser-webdriverio'] =
        latestVersion['@vitest/browser-webdriverio'];
    }

    if (playwright) {
      json.devDependencies['playwright'] = latestVersion['playwright'];
      json.devDependencies['@vitest/browser-playwright'] =
        latestVersion['@vitest/browser-playwright'];
    }

    if (coverageV8) {
      json.devDependencies['@vitest/coverage-v8'] = latestVersion['@vitest/coverage-v8'];
    }

    if (coverageIstanbul) {
      json.devDependencies['@vitest/coverage-istanbul'] =
        latestVersion['@vitest/coverage-istanbul'];
    }
  });

  await installWorkspacePackages();

  await updateJsonFile('angular.json', (json) => {
    const projects = Object.values(json['projects']);
    if (projects.length !== 1) {
      throw new Error(
        `Expected exactly one project but found ${projects.length} projects named ${Object.keys(
          json['projects'],
        ).join(', ')}`,
      );
    }
    const project = projects[0]! as any;

    // Update to Vitest builder.
    const test = project['architect']['test'];
    test['builder'] = '@angular/build:unit-test';
    test['options'] = {};
  });

  await updateJsonFile('tsconfig.spec.json', (tsconfig) => {
    tsconfig['compilerOptions']['types'] = ['vitest/globals'];
  });
}
