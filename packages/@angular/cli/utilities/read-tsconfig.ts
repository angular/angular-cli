import * as path from 'path';
import * as ts from 'typescript';

export function readTsconfig(tsconfigPath: string) {
  const configResult = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  const tsConfig = ts.parseJsonConfigFileContent(configResult.config, ts.sys,
    path.dirname(tsconfigPath), undefined, tsconfigPath);
  return tsConfig;
}

