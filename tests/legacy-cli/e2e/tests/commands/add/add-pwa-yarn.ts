import { join } from 'path';
import { expectFileToExist, readFile, rimraf } from '../../../utils/fs';
import { ng, npm } from '../../../utils/process';

export default async function () {
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
    // Let's restore the previous node_modules state by re-installing using 'npm'
    // and run 'webdriver-update'. Otherwise, we will start seeing errors in CI like:
    // Error: Could not find update-config.json. Run 'webdriver-manager update' to download binaries.
    await npm('install');
    await npm('run', 'webdriver-update');
}
