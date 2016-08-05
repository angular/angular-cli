import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import * as stringUtils from 'ember-cli-string-utils';
import { findNodes, findNodesByText } from './ast-utils'
import { InsertChange } from './change';
import { CliConfig } from '../models/config';

const config: any = CliConfig.fromProject();

export function insertIntoDeclarations(moduleFilePath: string, insertItem: string): Promise<void> {
  let sourceFile: ts.SourceFile = ts.createSourceFile(moduleFilePath, 
    fs.readFileSync(moduleFilePath).toString(),
    ts.ScriptTarget.ES6, true);
  let endPosition: number = findNodesByText(sourceFile, 'declarations')[0].end;
  let position: ts.LineAndCharacter = sourceFile.getLineAndCharacterOfPosition(endPosition);
  let line: number = position.line;
  let start: number = sourceFile.getPositionOfLineAndCharacter(line + 1, -3);

  return new InsertChange(moduleFilePath, start, `, ${insertItem}`).apply();
}

export function importIntoModule(options: any, directory: string, projectRoot: string): Promise<void> {
  if (!options['skip-import'] && config.apps[0].appmodule) {
    const appModulePath = path.join(projectRoot, directory, 
      config.apps[0].appmodule);

    const classifiedModuleName = 
      stringUtils.classify(`${options.entity.name}-${options.originBlueprintName}`);

    return this.insertIntoDeclarations(appModulePath, classifiedModuleName);
  } else {
    return Promise.resolve();
  }
}
