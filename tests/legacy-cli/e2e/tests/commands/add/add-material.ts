import { expectFileToMatch, rimraf } from '../../../utils/fs';
import { ng } from '../../../utils/process';


export default async function () {
  // forcibly remove in case another test doesn't clean itself up
  await rimraf('node_modules/@angular/material');

  try {
    await ng('add', '@angular/material', '--unknown');
  } catch (error) {
    if (!(error.message && error.message.includes(`Unknown option: '--unknown'`))) {
      throw error;
    }
  }

  await ng('add', '@angular/material', '--theme', 'custom', '--verbose');
  await expectFileToMatch('package.json', /@angular\/material/);

  const output1 = await ng('add', '@angular/material');
  if (!output1.stdout.includes('Skipping installation: Package already installed')) {
    throw new Error('Installation was not skipped');
  }

  const output2 = await ng('add', '@angular/material@latest');
  if (output2.stdout.includes('Skipping installation: Package already installed')) {
    throw new Error('Installation should not have been skipped');
  }

  const output3 = await ng('add', '@angular/material@8.0.0');
  if (output3.stdout.includes('Skipping installation: Package already installed')) {
    throw new Error('Installation should not have been skipped');
  }

  const output4 = await ng('add', '@angular/material@8');
  if (!output4.stdout.includes('Skipping installation: Package already installed')) {
    throw new Error('Installation was not skipped');
  }
}
