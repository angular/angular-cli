import {join} from 'path';
import {getGlobalVariable} from '../../utils/env';
import {expectFileToExist, expectFileToMatch, writeFile, moveFile} from '../../utils/fs';
import {ng, npm} from '../../utils/process';

export default function() {
  // Skip this in ejected tests.
  if (getGlobalVariable('argv').eject) {
    return Promise.resolve();
  }

  const rootManifest = join(process.cwd(), 'ngsw-manifest.json');

  // Can't use the `ng` helper because somewhere the environment gets
  // stuck to the first build done
  return npm('install', '@angular/service-worker')
    .then(() => ng('set', 'apps.0.serviceWorker=true'))
    .then(() => ng('build', '--prod'))
    .then(() => expectFileToExist(join(process.cwd(), 'dist')))
    .then(() => expectFileToExist(join(process.cwd(), 'dist/ngsw-manifest.json')))
    .then(() => ng('build', '--prod', '--base-href=/foo/bar'))
    .then(() => expectFileToExist(join(process.cwd(), 'dist/ngsw-manifest.json')))
    .then(() => expectFileToMatch('dist/ngsw-manifest.json', /"\/foo\/bar\/index.html"/))
    .then(() => writeFile(rootManifest, '{"local": true}'))
    .then(() => ng('build', '--prod'))
    .then(() => expectFileToMatch('dist/ngsw-manifest.json', /\"local\"/))
    .then(() => moveFile(rootManifest, join(process.cwd(), 'src/ngsw-manifest.json')))
    .then(() => ng('build', '--prod'))
    .then(() => expectFileToMatch('dist/ngsw-manifest.json', /\"local\"/));
}
