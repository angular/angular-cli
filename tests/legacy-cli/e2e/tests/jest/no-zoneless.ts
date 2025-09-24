import { applyJestBuilder } from '../../utils/jest';
import { installPackage, uninstallPackage } from '../../utils/packages';
import { ng } from '../../utils/process';

export default async function (): Promise<void> {
  await applyJestBuilder({
    tsConfig: 'tsconfig.spec.json',
    polyfills: ['zone.js', 'zone.js/testing'],
  });

  try {
    await installPackage('zone.js');
    const { stderr } = await ng('test');

    if (!stderr.includes('Jest builder is currently EXPERIMENTAL')) {
      throw new Error(`No experimental notice in stderr.\nSTDERR:\n\n${stderr}`);
    }
  } finally {
    await uninstallPackage('zone.js');
  }
}
