import { expectFileNotToExist, expectFileToExist } from '../../../utils/fs';
import { getActivePackageManager } from '../../../utils/packages';
import { git, ng } from '../../../utils/process';
import {
  createNpmConfigForAuthentication,
  setNpmEnvVarsForAuthentication,
} from '../../../utils/registry';

export default async function () {
  const packageManager = getActivePackageManager();

  if (packageManager === 'npm') {
    const originalEnvironment = { ...process.env };
    try {
      const command = ['add', '@angular/pwa', '--skip-confirmation'];

      // Environment variables only
      await expectFileNotToExist('src/manifest.webmanifest');
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
      process.env = originalEnvironment;
    }
  }
}
