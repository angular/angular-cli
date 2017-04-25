import {ng} from '../../../utils/process';
import {rename} from '../../../utils/fs';

export default function() {
  return Promise.resolve()
    .then(() => ng('get', 'apps.0.appRoot'))
    .then(({ stdout }) => {
      if (!stdout.match(/app/)) {
        throw new Error(`Expected "app", received "${JSON.stringify(stdout)}".`);
      }
    })
    .then(() => ng('set', 'apps.0.appRoot' , 'app1'))
    .then(() => ng('get', 'apps.0.appRoot'))
    .then(({ stdout }) => {
      if (!stdout.match(/app1/)) {
        throw new Error(`Expected "app1", received "${JSON.stringify(stdout)}".`);
      }
    })
    .then(() => rename('./src/app', './src/app1'))
    .then(() => ng('g', 'c', 'hello', '-d'))
    .then(({ stdout }) => {
      if (!stdout.match(/app1/)) {
        throw new Error(`Expected "app", received "${JSON.stringify(stdout)}".`);
      }
    });
}
