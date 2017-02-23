import {join} from 'path';
import {getGlobalVariable} from '../../utils/env';
import {expectFileToExist} from '../../utils/fs';
import {ng, npm} from '../../utils/process';

export default function() {
  // Skip this in ejected tests.
  if (getGlobalVariable('argv').eject) {
    return Promise.resolve();
  }

  // Can't use the `ng` helper because somewhere the environment gets
  // stuck to the first build done
  return npm('install', '@angular/service-worker')
    .then(() => ng('set', 'apps.0.serviceWorker=true'))
    .then(() => ng('build', '--prod'))
    .then(() => expectFileToExist(join(process.cwd(), 'dist')))
    .then(() => expectFileToExist(join(process.cwd(), 'dist/ngsw-manifest.json')));
}
