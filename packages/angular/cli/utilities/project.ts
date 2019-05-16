/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// tslint:disable:no-global-tslint-disable no-any
import { normalize } from '@angular-devkit/core';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CommandWorkspace } from '../models/interface';
import { findUp } from './find-up';

export function insideWorkspace(): boolean {
  return getWorkspaceDetails() !== null;
}

export function getWorkspaceDetails(): CommandWorkspace | null {
  const currentDir = process.cwd();
  const possibleConfigFiles = [
    'angular.json',
    '.angular.json',
    'angular-cli.json',
    '.angular-cli.json',
  ];
  const configFilePath = findUp(possibleConfigFiles, currentDir);
  if (configFilePath === null) {
    return null;
  }
  const configFileName = path.basename(configFilePath);

  const possibleDir = path.dirname(configFilePath);

  const homedir = os.homedir();
  if (normalize(possibleDir) === normalize(homedir)) {
    const packageJsonPath = path.join(possibleDir, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      // No package.json
      return null;
    }
    const packageJsonBuffer = fs.readFileSync(packageJsonPath);
    const packageJsonText = packageJsonBuffer === null ? '{}' : packageJsonBuffer.toString();
    const packageJson = JSON.parse(packageJsonText);
    if (!containsCliDep(packageJson)) {
      // No CLI dependency
      return null;
    }
  }

  return {
    root: possibleDir,
    configFile: configFileName,
  };
}

function containsCliDep(obj: any): boolean {
  const pkgName = '@angular/cli';
  if (obj) {
    if (obj.dependencies && obj.dependencies[pkgName]) {
      return true;
    }
    if (obj.devDependencies && obj.devDependencies[pkgName]) {
      return true;
    }
  }

  return false;
}
