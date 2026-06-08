import express from 'express';
import * as path from 'node:path';
import { copyProjectAsset } from '../../utils/assets';
import { appendToFile, createDir, replaceInFile, writeFile } from '../../utils/fs';
import { exec, ng } from '../../utils/process';
import { installPackage } from '../../utils/packages';

/**
 * The list of development dependencies used by the E2E protractor-based builder.
 */
const E2E_DEV_DEPENDENCIES = [
  'protractor@~7.0.0',
  'jasmine-spec-reporter@~7.0.0',
  'ts-node@~10.9.0',
  '@types/node@^20.17.19',
];

export default async function () {
  // Ensure SauceLabs configuration
  if (!process.env['SAUCE_USERNAME'] || !process.env['SAUCE_ACCESS_KEY']) {
    throw new Error('SauceLabs is not configured.');
  }

  for (const e2eDep of E2E_DEV_DEPENDENCIES) {
    await installPackage(e2eDep);
  }

  await appendToFile(
    'src/app/app.config.ts',
    "import { provideProtractorTestingSupport } from '@angular/platform-browser';\n",
  );
  await replaceInFile(
    'src/app/app.config.ts',
    'providers: [',
    'providers: [\n    provideProtractorTestingSupport(),\n',
  );

  // Workaround for https://github.com/angular/angular/issues/32192
  await replaceInFile('src/app/app.html', /class="material-icons"/g, '');

  await ng('build');

  // Add Protractor configuration
  await copyProjectAsset('protractor-saucelabs.conf.js', 'e2e/protractor-saucelabs.conf.js');

  // Add App E2E test file
  await createDir('e2e/src');
  await writeFile(
    'e2e/src/app.e2e-spec.ts',
    `
import { browser, by, element, logging } from 'protractor';

describe('workspace-project App', () => {
  it('should display welcome message', async () => {
    await browser.get(browser.baseUrl);
    expect((await element(by.css('h1')).getText()).trim()).toEqual('Hello, test-project');
  });
});
`,
  );

  // Add App E2E tsconfig file
  await writeFile(
    'e2e/tsconfig.json',
    `
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "outDir": "out-tsc/e2e",
    "module": "commonjs",
    "target": "es2019",
    "types": [
      "jasmine",
      "node"
    ]
  }
}
`,
  );

  // Setup server
  const app = express();
  app.use(express.static(path.resolve('dist/test-project/browser')));
  const server = app.listen(2000, 'localhost');

  try {
    // Execute application's E2E tests with SauceLabs
    const binPath = path.join('node_modules', '.bin', 'protractor');
    await exec(binPath, 'e2e/protractor-saucelabs.conf.js');
  } finally {
    server.close();
  }
}
