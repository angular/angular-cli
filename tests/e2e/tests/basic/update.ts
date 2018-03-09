import { ng, silentNpm } from '../../utils/process';
import { readFile, writeFile } from '../../utils/fs';
import { updateJsonFile } from '../../utils/project';


export default function () {
  let origPackageJson: string;
  let origCoreVersion: string;
  let origCliVersion: string;

  function updateVersions(obj: any) {
    const keys = Object.keys(obj);
    keys.forEach(key => {
      if (key.startsWith('@angular/')) {
        obj[key] = '2.0.0';
      }
    });
  }

  return readFile('package.json')
    .then((content) => origPackageJson = content)
    .then(() => updateJsonFile('package.json', obj => {
      origCoreVersion = obj.dependencies['@angular/core'];
      origCliVersion = obj.devDependencies['@angular/cli'];
      updateVersions(obj.dependencies);
      updateVersions(obj.devDependencies);
      obj.devDependencies['@angular/cli'] = '1.6.5';
    }))
    .then(() => ng('update'))
    .then(() => readFile('package.json'))
    .then(s => {
      const obj = JSON.parse(s);
      const version = obj.dependencies['@angular/core'];
      const cliVersion = obj.devDependencies['@angular/cli'];
      if (origCoreVersion === version || origCliVersion === cliVersion) {
        throw new Error('Versions not updated');
      }
    })
    .then(() => writeFile('package.json', origPackageJson))
    .then(() => silentNpm('install'));
}
