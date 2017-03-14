import * as fs from 'fs-extra';
import { join } from 'path';
import {testGenerate} from '../../../utils/generate';


export default function () {
  const root = process.cwd();
  const testPath = join(root, 'src', 'app');

  process.chdir(testPath);
  fs.mkdirSync('./sub-dir');

  return testGenerate({
    blueprint: 'module',
    name: 'sub-dir/child',
    flags: ['--routing'],
    pathsToVerify: [
      join(testPath, 'sub-dir/child'),
      join(testPath, 'sub-dir/child', 'child.module.ts'),
      join(testPath, 'sub-dir/child', 'child-routing.module.ts'),
      '!' + join(testPath, 'sub-dir/child', 'child.spec.ts')
    ]})
}
