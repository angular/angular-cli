import { ng, silentNpm } from '../../utils/process';
import { readFile, writeFile } from '../../utils/fs';
import { updateJsonFile } from '../../utils/project';


export default function () {
  // Disable this e2e as it takes about 10 minutes on a good computer and is flaky.
  if (!process.env['E2E_UPDATE']) {
    return Promise.resolve();
  }

  let origPackageJson: string;
  let origCoreVersion: string;
  let origCliVersion: string;
  let origTypeScriptVersion: string;

  function updateVersions(obj: any) {
    const keys = Object.keys(obj);
    keys.forEach(key => {
      if (key.startsWith('@angular/')) {
        obj[key] = '2.1.0';
      }
    });
  }

  return readFile('package.json')
    .then((content) => origPackageJson = content)
    .then(() => updateJsonFile('package.json', obj => {
      origCoreVersion = obj.dependencies['@angular/core'];
      origCliVersion = obj.devDependencies['@angular/cli'];
      origTypeScriptVersion = obj.devDependencies['typescript'];
      obj.devDependencies['@angular/cli'] = '1.6.5';
      obj.devDependencies['typescript'] = '2.0.2';
      obj.dependencies['rxjs'] = '5.0.0-beta.12';
    }))
    .then(() => ng('update', '@angular/cli', 'typescript'))
    .then(() => readFile('package.json'))
    .then(s => {
      const obj = JSON.parse(s);
      if (origCliVersion === obj.devDependencies['@angular/cli']) {
        throw new Error('CLI version not updated');
      }
      if (origTypeScriptVersion === obj.devDependencies['typescript']) {
        throw new Error('TypeScript version not updated');
      }
    })
    .then(() => writeFile('package.json', origPackageJson))
    .then(() => silentNpm('install'));
}
