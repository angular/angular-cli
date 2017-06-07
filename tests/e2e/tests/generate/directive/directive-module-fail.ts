import {expectToFail} from '../../../utils/utils';
import {testGenerate} from '../../../utils/generate';


export default function() {
  return expectToFail(() =>
    testGenerate({blueprint: 'directive', name: 'dir', flags: ['--module', 'app.moduleX.ts']}));
}
