import {npm} from '../utils/process';
import {updateJsonFile} from '../utils/project';
import {join} from 'path';

const packages = require('../../../lib/packages');

export default function() {
  return npm('run', 'build')
    .then(() => console.log('Updating package.json from dist...'))
    .then(() => Promise.all(Object.keys(packages).map(pkgName => {
      return updateJsonFile(join(packages[pkgName].dist, 'package.json'), json => {
        Object.keys(packages).forEach(pkgName => {
          if (json['dependencies'] && pkgName in json['dependencies']) {
            json['dependencies'][pkgName] = packages[pkgName].dist;
          } else if (json['devDependencies'] && pkgName in json['devDependencies']) {
            json['devDependencies'][pkgName] = packages[pkgName].dist;
          }
        });
      });
    })));
}
