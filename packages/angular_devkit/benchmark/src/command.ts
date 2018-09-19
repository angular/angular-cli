/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export class Command {
  constructor(
    public cmd: string,
    public args: string[] = [],
    public cwd: string = process.cwd(),
    public expectedExitCode = 0,
  ) { }

  toString() {
    const { cmd, args, cwd } = this;
    const argsStr = args.length > 0 ? ' ' + args.join(' ') : '';

    return `${cmd}${argsStr} (at ${cwd})`;
  }
}
