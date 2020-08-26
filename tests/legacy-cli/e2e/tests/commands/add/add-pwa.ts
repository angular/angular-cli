import { join } from 'path';
import { expectFileToExist, readFile, rimraf } from '../../../utils/fs';
import { ng } from '../../../utils/process';

export default async function () {
    // forcibly remove in case another test doesn't clean itself up
    await rimraf('node_modules/@angular/pwa');
    await ng('add', '@angular/pwa');
    await expectFileToExist(join(process.cwd(), 'src/manifest.webmanifest'));

    // Angular PWA doesn't install as a dependency
    const { dependencies, devDependencies } = JSON.parse(await readFile(join(process.cwd(), 'package.json')));
    const hasPWADep = Object.keys({ ...dependencies, ...devDependencies })
        .some(d => d === '@angular/pwa');
    if (hasPWADep) {
        throw new Error(`Expected 'package.json' not to contain a dependency on '@angular/pwa'.`);
    }
}
