/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { normalize } from '@angular-devkit/core';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { findUp } from './find-up';

interface PackageDependencies {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export function findWorkspaceFile(currentDirectory = process.cwd()): string | null {
  const possibleConfigFiles = ['angular.json', '.angular.json'];
  const configFilePath = findUp(possibleConfigFiles, currentDirectory);
  if (configFilePath === null) {
    return null;
  }

  const possibleDir = path.dirname(configFilePath);

  const homedir = os.homedir();
  if (normalize(possibleDir) === normalize(homedir)) {
    const packageJsonPath = path.join(possibleDir, 'package.json');

    try {
      const packageJsonText = fs.readFileSync(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonText) as PackageDependencies;
      if (!containsCliDep(packageJson)) {
        // No CLI dependency
        return null;
      }
    } catch {
      // No or invalid package.json
      return null;
    }
  }

  return configFilePath;
}

function containsCliDep(obj?: PackageDependencies): boolean {
  const pkgName = '@angular/cli';
  if (!obj) {
    return false;
  }

  return !!(obj.dependencies?.[pkgName] || obj.devDependencies?.[pkgName]);
}
