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
  // Can't use the `ng` helper because somewhere the environment gets
  // stuck to the first build done
  return silentNpm('remove', '@angular/service-worker')
    .then(() => silentNpm('install', '@angular/service-worker'))
    .then(() => ng('config', 'projects.test-project.architect.build.options.serviceWorker', 'true'))
    .then(() => writeFile('src/ngsw-config.json', JSON.stringify(MANIFEST, null, 2)))
    .then(() => ng('build', '--optimization'))
    .then(() => expectFileToExist(join(process.cwd(), 'dist')))
    .then(() => expectFileToExist(join(process.cwd(), 'dist/test-project/ngsw.json')))
    .then(() => ng('build', '--optimization', '--base-href=/foo/bar'))
    .then(() => expectFileToExist(join(process.cwd(), 'dist/test-project/ngsw.json')))
    .then(() => expectFileToMatch('dist/test-project/ngsw.json', /"\/foo\/bar\/index.html"/))
    .then(() => ng('build', '--optimization', '--service-worker=false'))
    .then(() => expectFileNotToExist('dist/test-project/ngsw.json'))
    .then(() => writeFile('node_modules/@angular/service-worker/safety-worker.js', 'false'))
    .then(() => ng('build', '--optimization'))
    .then(() => expectFileToExist('dist/test-project/safety-worker.js'))
    .then(() => expectFileToExist('dist/test-project/worker-basic.min.js'));
}
