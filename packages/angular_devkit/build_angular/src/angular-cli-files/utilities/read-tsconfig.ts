/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable
// TODO: cleanup this file, it's copied as is from Angular CLI.
import * as ts from 'typescript';
import * as path from 'path';
import { requireProjectModule } from '../utilities/require-project-module';

export function readTsconfig(tsconfigPath: string) {
  const projectTs = requireProjectModule(path.dirname(tsconfigPath), 'typescript') as typeof ts;
  const configResult = projectTs.readConfigFile(tsconfigPath, projectTs.sys.readFile);
  const tsConfig = projectTs.parseJsonConfigFileContent(configResult.config, projectTs.sys,
    path.dirname(tsconfigPath), undefined, tsconfigPath);
  return tsConfig;
}
