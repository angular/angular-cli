import * as path from 'path';
import { requireProjectModule } from '../utilities/require-project-module';

export function readTsconfig(tsconfigPath: string) {
  const projectTs = requireProjectModule(path.dirname(tsconfigPath), 'typescript');
  const configResult = projectTs.readConfigFile(tsconfigPath, projectTs.sys.readFile);
  const tsConfig = projectTs.parseJsonConfigFileContent(configResult.config, projectTs.sys,
    path.dirname(tsconfigPath), undefined, tsconfigPath);
  return tsConfig;
}

