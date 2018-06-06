import {join} from 'path';
import {getGlobalVariable} from '../utils/env';
import {git, npm} from '../utils/process';
import {updateJsonFile} from '../utils/project';

const packages = require('../../../lib/packages').packages;

export default function() {
  const argv = getGlobalVariable('argv');

  if (argv.nobuild) {
    return;
  }

  const getCurrentBranch = () => {
    // Get branch from CI, or default to querying git for local.
    const ciBranch = process.env.TRAVIS_BRANCH
      || process.env.APPVEYOR_REPO_BRANCH
      || process.env.CIRCLE_BRANCH;

    if (ciBranch) {
      return Promise.resolve(ciBranch);
    } else {
      return git('symbolic-ref', '--short', 'HEAD')
        .then(({stdout}) => stdout.trim());
    }
  };

  let devkitArg = '';

  return getCurrentBranch()
    .then(currentBranch => {
      // Only use custom devkit when on master.
      if (currentBranch === 'master') {
        // Use a specific devkit path if specified, otherwise use snapshots.
        devkitArg = argv.devkit ? '--devkit=' + argv.devkit : '--devkit-snapshots';
      }
    })
    .then(() => npm('run', 'build', '--', '--local', devkitArg))
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
