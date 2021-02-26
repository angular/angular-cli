import { join } from 'path';
import { getGlobalVariable } from '../../../utils/env';
import { expectFileToExist, readFile, rimraf } from '../../../utils/fs';
import { ng, npm } from '../../../utils/process';

export default async function () {
    if (getGlobalVariable('package-manager') === 'yarn') {
      return;
    }

    // forcibly remove in case another test doesn't clean itself up
    await rimraf('node_modules/@angular/pwa');

    // set yarn as package manager
    await ng('config', 'cli.packageManager', 'yarn');
    await ng('add', '@angular/pwa');
    await expectFileToExist(join(process.cwd(), 'src/manifest.webmanifest'));

    // Angular PWA doesn't install as a dependency
    const { dependencies, devDependencies } = JSON.parse(await readFile(join(process.cwd(), 'package.json')));
    const hasPWADep = Object.keys({ ...dependencies, ...devDependencies })
        .some(d => d === '@angular/pwa');
    if (hasPWADep) {
        throw new Error(`Expected 'package.json' not to contain a dependency on '@angular/pwa'.`);
    }

    // 'yarn' will nuke the entire node_modules when it is triggered during the above tests.
    await rimraf('node_modules');
    await npm('install');
}
