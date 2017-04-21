import {join} from 'path';
import {npm, exec} from '../utils/process';
import {updateJsonFile} from '../utils/project';
import {getGlobalVariable} from '../utils/env';

const packages = require('../../../lib/packages').packages;


export default function () {
  return Promise.resolve()
    .then(() => {
      const argv = getGlobalVariable('argv');
      if (argv.nolink) {
        return;
      }

      const distAngularCli = packages['@angular/cli'].dist;
      const oldCwd = process.cwd();
      process.chdir(distAngularCli);

      // Update the package.json of each packages.
      return Promise.all(Object.keys(packages).map(pkgName => {
        const p = packages[pkgName];

        return updateJsonFile(join(p.dist, 'package.json'), json => {
          for (const pkgName of Object.keys(packages)) {
            if (json['dependencies'] && json['dependencies'][pkgName]) {
              json['dependencies'][pkgName] = packages[pkgName].dist;
            }
            if (json['devDependencies'] && json['devDependencies'][pkgName]) {
              json['devDependencies'][pkgName] = packages[pkgName].dist;
            }
          }
        });
      }))
      .then(() => npm('link'))
      .then(() => process.chdir(oldCwd));
    })
    .then(() => exec(process.platform.startsWith('win') ? 'where' : 'which', 'ng'));
}
