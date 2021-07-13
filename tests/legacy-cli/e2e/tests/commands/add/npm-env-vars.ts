import { expectFileNotToExist, expectFileToExist, writeFile } from '../../../utils/fs';
import { getActivePackageManager, setRegistry } from '../../../utils/packages';
import { git, ng } from '../../../utils/process';
import {
  createNpmConfigForAuthentication,
  resetNpmEnvVars,
  setNpmEnvVarsForAuthentication,
} from '../../../utils/registry';

export default async function () {
  const packageManager = getActivePackageManager();

  if (packageManager === 'npm') {
    try {
      const command = ['add', '@angular/pwa', '--skip-confirmation'];

      // Environment variables only
      await expectFileNotToExist('src/manifest.webmanifest');
      await writeFile('.npmrc', '');
      setNpmEnvVarsForAuthentication();
      await ng(...command);
      await expectFileToExist('src/manifest.webmanifest');
      await git('clean', '-dxf');

      // Mix of config file and env vars works
      await expectFileNotToExist('src/manifest.webmanifest');
      await createNpmConfigForAuthentication(false, true);
      await ng(...command);
      await expectFileToExist('src/manifest.webmanifest');
    } finally {
      await setRegistry(true);
      resetNpmEnvVars();
    }
  }
}
