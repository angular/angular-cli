import { ng } from '../../utils/process';
import {expectFileToMatch} from '../../utils/fs';

export default function() {
  return ng('build', '--aot=true')
    .then(() => expectFileToMatch('dist/test-project/main.js',
      /platformBrowser.*bootstrapModuleFactory.*AppModuleNgFactory/));
}
