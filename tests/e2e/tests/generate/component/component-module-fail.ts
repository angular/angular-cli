import { expectToFail } from '../../../utils/utils';
import { testGenerate } from "../../../utils/generate";


export default function() {
  return expectToFail(() =>
    testGenerate({blueprint: 'component', name: 'comp', flags: ['--module', 'app.moduleX.ts']}));
}
