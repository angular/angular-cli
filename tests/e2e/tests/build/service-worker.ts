import {join} from 'path';
import {npm} from '../../utils/process';
import {expectFileToExist} from '../../utils/fs';
import {ng} from '../../utils/process';

export default function() {
  // Can't use the `ng` helper because somewhere the environment gets
  // stuck to the first build done
  return npm('install', '@angular/service-worker')
    .then(() => ng('set', 'apps.0.serviceWorker=true'))
    .then(() => ng('build', '--prod'))
    .then(() => expectFileToExist(join(process.cwd(), 'dist')))
    .then(() => expectFileToExist(join(process.cwd(), 'dist/ngsw-manifest.json')));
}
