import { ng } from '../../utils/process';
import {expectFileToMatch} from '../../utils/fs';

export default function() {
  return ng('build', '--aot=true')
    .then(() => expectFileToMatch('dist/main.js',
      /platformBrowser.*bootstrapModuleFactory.*AppModuleNgFactory/));
}
