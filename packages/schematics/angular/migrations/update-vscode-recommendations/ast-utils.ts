/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Rule, Tree } from '@angular-devkit/schematics';

export function readJsonInTree<T>(host: Tree, path: string): T {
  if (!host.exists(path)) {
    throw new Error(`Cannot find ${path}`);
  }

  const json = host.read(path);
  if (!json) {
    throw new Error(`Cannot read ${path}`);
  }

  return JSON.parse(json.toString('utf-8'));
}

export function serializeJson<T>(json: T): string {
  return `${JSON.stringify(json, null, 2)}\n`;
}

export function updateJsonInTree<T, O = T>(
  path: string,
  callback: (json: T) => O,
): Rule {
  return (host: Tree): Tree => {
    if (!host.exists(path)) {
      host.create(path, serializeJson(callback({} as T)));

      return host;
    }
    host.overwrite(path, serializeJson(callback(readJsonInTree(host, path))));

    return host;
  };
}
