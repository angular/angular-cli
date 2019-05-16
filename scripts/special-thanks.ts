/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-implicit-dependencies
import { logging } from '@angular-devkit/core';
import { execSync } from 'child_process';

export default function (opts: { sha: string }, logger: logging.Logger) {
  const authors = execSync(`git log ${opts.sha}.. --format="%aN"`).toString();

  const counter = new Map<string, number>();
  for (const name of authors.split(/\r?\n/g)) {
    if (name) {
      const maybeCounter = counter.get(name);
      counter.set(name, (maybeCounter || 0) + 1);
    }
  }

  const sortedCount = [...counter.entries()].sort((a, b) => b[1] - a[1]);

  for (const count of sortedCount) {
    logger.info(count[0] + ' ' + count[1]);
  }
}
