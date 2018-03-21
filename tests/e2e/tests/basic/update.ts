import { ng, silentNpm } from '../../utils/process';
import { readFile, writeFile } from '../../utils/fs';
import { updateJsonFile } from '../../utils/project';


export default function () {
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
      updateVersions(obj.dependencies);
      updateVersions(obj.devDependencies);
      obj.devDependencies['@angular/cli'] = '1.6.5';
      obj.devDependencies['typescript'] = '2.0.2';
      obj.dependencies['rxjs'] = '5.0.0-beta.12';
    }))
    .then(() => ng('update'))
    .then(() => readFile('package.json'))
    .then(s => {
      const obj = JSON.parse(s);
      if (origCoreVersion === obj.dependencies['@angular/core']) {
        throw new Error('Angular Core version not updated');
      }
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
