import {join} from 'path';
import {testGenerate} from '../../utils/generate';


export default function() {
  const interfaceDir = join('src', 'app');

  return testGenerate({
    blueprint: 'interface',
    name: 'basic',
    flags: ['model'],
    pathsToVerify: [
      interfaceDir,
      join(interfaceDir, 'basic.model.ts')
    ]
  });
}
