import { ng } from '../../utils/process';
import { readFile } from '../../utils/fs';
import { updateJsonFile } from '../../utils/project';

function updateVersions(obj: any) {
  const keys = Object.keys(obj);
  keys.forEach(key => {
    if (key.startsWith('@angular/')) {
      obj[key] = '2.0.0';
    }
  });
}

export default function () {
  let origCoreVersion: string;
  let origCliVersion: string;
  return updateJsonFile('package.json', obj => {
    origCoreVersion = obj.dependencies['@angular/core'];
    origCliVersion = obj.devDependencies['@angular/cli'];
    updateVersions(obj.dependencies);
    updateVersions(obj.devDependencies);
    obj.devDependencies['@angular/cli'] = '1.6.5';
    })
    .then(() => ng('update'))
    .then(() => readFile('package.json'))
    .then(s => {
      const obj = JSON.parse(s);
      const version = obj.dependencies['@angular/core'];
      const cliVersion = obj.devDependencies['@angular/cli'];
      if (origCoreVersion === version || origCliVersion === cliVersion) {
        throw new Error('Versions not updated');
      }
    });
}
