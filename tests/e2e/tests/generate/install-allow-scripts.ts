import { copyAssets } from '../../utils/assets';
import { expectFileNotToExist, expectFileToExist, rimraf } from '../../utils/fs';
import { ng } from '../../utils/process';

export default async function () {
  // Copy test schematic into test project to ensure schematic dependencies are available
  await copyAssets('schematic-allow-scripts', 'schematic-allow-scripts');

  // By default should not run the postinstall from the added package.json in the schematic
  await ng('generate', './schematic-allow-scripts:test');
  await expectFileToExist('install-test/package.json');
  await expectFileNotToExist('install-test/post-script-ran');

  // Cleanup for next test case
  await rimraf('install-test');

  // Should run the postinstall if the allowScripts task option is enabled
  // For testing purposes, this schematic exposes the task option via a schematic option
  await ng('generate', './schematic-allow-scripts:test', '--allow-scripts');
  await expectFileToExist('install-test/package.json');
  await expectFileToExist('install-test/post-script-ran');

  // Cleanup for next test case
  await rimraf('install-test');

  // Package manager configuration should take priority
  // The `ignoreScripts` schematic option sets the value of the `ignore-scripts` option in a test project `.npmrc`
  await ng('generate', './schematic-allow-scripts:test', '--allow-scripts', '--ignore-scripts');
  await expectFileToExist('install-test/package.json');
  await expectFileNotToExist('install-test/post-script-ran');
}
