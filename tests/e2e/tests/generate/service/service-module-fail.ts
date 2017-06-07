import {expectToFail} from '../../../utils/utils';
import {testGenerate} from '../../../utils/generate';


export default function() {
  return expectToFail(() =>
    testGenerate({blueprint: 'service', name: 'fail', flags: ['--module', 'app.moduleX.ts']}));
}
