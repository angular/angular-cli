import express from 'express';
import * as path from 'path';
import { copyProjectAsset } from '../../utils/assets';
import { replaceInFile } from '../../utils/fs';
import { ng } from '../../utils/process';

export default async function () {
  if (!process.env['E2E_BROWSERS']) {
    return;
  }

  // Ensure SauceLabs configuration
  if (!process.env['SAUCE_USERNAME'] || !process.env['SAUCE_ACCESS_KEY']) {
    throw new Error('SauceLabs is not configured.');
  }

  await replaceInFile('.browserslistrc', 'not IE 11', 'IE 11');

  // Workaround for https://github.com/angular/angular/issues/32192
  await replaceInFile('src/app/app.component.html', /class="material-icons"/g, '');

  await ng('build');

  // Add Protractor configuration
  await copyProjectAsset('protractor-saucelabs.conf.js', 'e2e/protractor-saucelabs.conf.js');

  // Remove browser log checks as they are only supported with the chrome webdriver
  await replaceInFile(
    'e2e/src/app.e2e-spec.ts',
    'await browser.manage().logs().get(logging.Type.BROWSER)',
    '[] as any',
  );

  // Workaround defect in getText WebDriver implementation for Safari/Edge
  // Leading and trailing space is not removed
  await replaceInFile(
    'e2e/src/app.e2e-spec.ts',
    'await page.getTitleText()',
    '(await page.getTitleText()).trim()',
  );

  // Setup server
  const app = express();
  app.use(express.static(path.resolve('dist/test-project')));
  const server = app.listen(2000, 'localhost');

  try {
    // Execute application's E2E tests with SauceLabs
    await ng(
      'e2e',
      'test-project',
      '--protractorConfig=e2e/protractor-saucelabs.conf.js',
      '--devServerTarget=',
    );
  } finally {
    server.close();
  }
}
