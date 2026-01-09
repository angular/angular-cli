import { expectFileToMatch } from '../../../utils/fs';
import { uninstallPackage } from '../../../utils/packages';
import { ng } from '../../../utils/process';
import { applyVitestBuilder } from '../../../utils/vitest';

export default async function () {
  await applyVitestBuilder();

  try {
    await ng('add', '@vitest/browser-playwright', '--skip-confirmation');

    await expectFileToMatch('package.json', /"@vitest\/browser-playwright":/);
    await expectFileToMatch('package.json', /"playwright":/);
    await expectFileToMatch('tsconfig.spec.json', /"vitest\/globals"/);
    await expectFileToMatch('tsconfig.spec.json', /"@vitest\/browser-playwright"/);
  } finally {
    await uninstallPackage('@vitest/browser-playwright');
    await uninstallPackage('playwright');
  }
}
