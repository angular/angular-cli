import { assertIsError } from '../../../utils/utils';
import { expectFileToMatch, rimraf } from '../../../utils/fs';
import { uninstallPackage } from '../../../utils/packages';
import { execWithEnv } from '../../../utils/process';
import { isPrereleaseCli } from '../../../utils/project';

export default async function () {
  // forcibly remove in case another test doesn't clean itself up
  await rimraf('node_modules/@angular/material');

  const isPrerelease = await isPrereleaseCli();
  const tag = isPrerelease ? '@next' : '';
  const processEnv = {
    ...process.env,
    // `@angular/material` pre-release may not support the current version of `@angular/core` pre-release.
    // due to the order of releases FW -> CLI -> Material
    // In this case peer dependency ranges may not resolve causing npm 7+ to fail during tests.
    'NPM_CONFIG_legacy_peer_deps': isPrerelease
      ? 'true'
      : process.env['NPM_CONFIG_legacy_peer_deps'],
  };

  try {
    await execWithEnv(
      'ng',
      ['add', `@angular/material${tag}`, '--skip-confirmation', '--unknown'],
      processEnv,
    );
  } catch (error) {
    assertIsError(error);
    if (!(error as Error).message.includes(`Unknown option: '--unknown'`)) {
      throw error;
    }
  }

  await execWithEnv(
    'ng',
    ['add', `@angular/material${tag}`, '--theme', 'custom', '--verbose', '--skip-confirmation'],
    processEnv,
  );

  await expectFileToMatch('package.json', /@angular\/material/);

  // Clean up existing cdk package
  // Not doing so can cause adding material to fail if an incompatible cdk is present
  await uninstallPackage('@angular/cdk');
}
