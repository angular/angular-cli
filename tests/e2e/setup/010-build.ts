import {join} from 'path';
import {getGlobalVariable} from '../utils/env';
import {npm} from '../utils/process';
import {updateJsonFile} from '../utils/project';

const packages = require('../../../lib/packages').packages;

export default function() {
  const argv = getGlobalVariable('argv');

  if (argv.nobuild) {
    return;
  }

  return npm('run', 'build')
    .then(() => console.log('Updating package.json from dist...'))
    .then(() => Promise.all(Object.keys(packages).map(pkgName => {
      return updateJsonFile(join(packages[pkgName].dist, 'package.json'), json => {
        Object.keys(packages).forEach(pkgName => {
          if (!json['dependencies']) {
            json['dependencies'] = {};
          }
          if (!json['devDependencies']) {
            json['devDependencies'] = {};
          }
          if (json['dependencies'] && pkgName in json['dependencies']) {
            json['dependencies'][pkgName] = packages[pkgName].dist;
          } else if (json['devDependencies'] && pkgName in json['devDependencies']) {
            json['devDependencies'][pkgName] = packages[pkgName].dist;
          }
        });
      });
    })))
    .then(() => {
      if (!argv.nightly && !argv['ng-sha']) {
        return;
      }

      console.log('Updating package.json from dist for nightly Angular packages...');
      const label = argv['ng-sha'] ? `#2.0.0-${argv['ng-sha']}` : '';

      return Promise.all(Object.keys(packages).map(pkgName => {
        return updateJsonFile(join(packages[pkgName].dist, 'package.json'), json => {
          Object.keys(json['dependencies'] || {})
            .filter(name => name.match(/^@angular\//))
            .forEach(name => {
              const pkgName = name.split(/\//)[1];
              json['dependencies'][`@angular/${pkgName}`]
                = `github:angular/${pkgName}-builds${label}`;
            });

          Object.keys(json['devDependencies'] || {})
            .filter(name => name.match(/^@angular\//))
            .forEach(name => {
              const pkgName = name.split(/\//)[1];
              json['devDependencies'][`@angular/${pkgName}`]
                = `github:angular/${pkgName}-builds${label}`;
            });
        });
      }));
    });
}
