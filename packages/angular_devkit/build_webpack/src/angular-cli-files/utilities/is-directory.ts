// tslint:disable
// TODO: cleanup this file, it's copied as is from Angular CLI.

import * as fs from 'fs';

export function isDirectory(path: string) {
  try {
    return fs.statSync(path).isDirectory();
  } catch (_) {
    return false;
  }
}
