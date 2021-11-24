import { expectFileToMatch, rimraf } from '../../../utils/fs';
import { uninstallPackage } from '../../../utils/packages';
import { ng } from '../../../utils/process';
import { isPrereleaseCli } from '../../../utils/project';


export default async function () {
  // forcibly remove in case another test doesn't clean itself up.
  await rimraf('node_modules/@angular/localize');

  const tag = await isPrereleaseCli() ?  '@next' : '';

  await ng('add',  `@angular/localize${tag}`);
  await expectFileToMatch('package.json', /@angular\/localize/);

  const output1 = await ng('add', '@angular/localize');
  if (!output1.stdout.includes('Skipping installation: Package already installed')) {
    throw new Error('Installation was not skipped');
  }

  const output3 = await ng('add', '@angular/localize@10.0.0');
  if (output3.stdout.includes('Skipping installation: Package already installed')) {
    throw new Error('Installation should not have been skipped');
  }

  const output4 = await ng('add', '@angular/localize@10');
  if (!output4.stdout.includes('Skipping installation: Package already installed')) {
    throw new Error('Installation was not skipped');
  }

  await uninstallPackage('@angular/localize');
}
