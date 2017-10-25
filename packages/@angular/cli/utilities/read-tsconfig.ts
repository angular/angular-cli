import * as path from 'path';
import * as ts from 'typescript';
import { requireProjectModule } from '../utilities/require-project-module';

export function readTsconfig(tsconfigPath: string) {
  const projectTs = requireProjectModule(path.dirname(tsconfigPath), 'typescript');
  const configResult = projectTs.readConfigFile(tsconfigPath, ts.sys.readFile);
  const tsConfig = projectTs.parseJsonConfigFileContent(configResult.config, ts.sys,
    path.dirname(tsconfigPath), undefined, tsconfigPath);
  return tsConfig;
}

