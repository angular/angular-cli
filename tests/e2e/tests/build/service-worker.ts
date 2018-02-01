import {join} from 'path';
import {getGlobalVariable} from '../../utils/env';
import {expectFileNotToExist, expectFileToExist, expectFileToMatch, writeFile} from '../../utils/fs';
import {ng, npm, silentNpm} from '../../utils/process';

const MANIFEST = {
  index: '/index.html',
  assetGroups: [{
    name: 'cli',
    resources: {
      files: [
        '/**/*.html',
        '/**/*.js',
        '/**/*.css',
        '/assets/**/*',
        '!/ngsw-worker.js',
      ],
      urls: [
        'http://test.com/foo/bar',
      ],
    },
  }],
};

export default function() {
  // Skip this in ejected tests.
  if (getGlobalVariable('argv').eject) {
    return Promise.resolve();
  }

  // Can't use the `ng` helper because somewhere the environment gets
  // stuck to the first build done
  return silentNpm('remove', '@angular/service-worker')
    .then(() => silentNpm('install', '@angular/service-worker'))
    .then(() => ng('set', 'apps.0.serviceWorker=true'))
    .then(() => writeFile('src/ngsw-config.json', JSON.stringify(MANIFEST, null, 2)))
    .then(() => ng('build', '--prod'))
    .then(() => expectFileToExist(join(process.cwd(), 'dist')))
    .then(() => expectFileToExist(join(process.cwd(), 'dist/ngsw.json')))
    .then(() => ng('build', '--prod', '--base-href=/foo/bar'))
    .then(() => expectFileToExist(join(process.cwd(), 'dist/ngsw.json')))
    .then(() => expectFileToMatch('dist/ngsw.json', /"\/foo\/bar\/index.html"/))
    .then(() => ng('build', '--prod', '--service-worker=false'))
    .then(() => expectFileNotToExist('dist/ngsw.json'))
    .then(() => writeFile('node_modules/@angular/service-worker/safety-worker.js', 'false'))
    .then(() => ng('build', '--prod'))
    .then(() => expectFileToExist('dist/safety-worker.js'))
    .then(() => expectFileToExist('dist/worker-basic.min.js'))
    .then(() => ng('eject', '--prod'))
    .then(() => silentNpm('install'))
    .then(() => npm('run', 'build'))
    .then(() => expectFileToMatch('package.json', /"sw-config"/))
    .then(() => expectFileToExist(join(process.cwd(), 'dist/ngsw-worker.js')))
    .then(() => expectFileToExist(join(process.cwd(), 'dist/ngsw.json')))
    .then(() => ng('set', 'apps.0.serviceWorker=false'));
}
