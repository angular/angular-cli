/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { dirname } from 'path';
import { toArray } from 'rxjs/operators';
import { Command } from './command';
import { LocalMonitoredProcess } from './monitored-process';

describe('LocalMonitoredProcess', () => {
  const cmd = new Command(
    'node',
    ['test-script.js'],
    dirname(require.resolve('./test/test-script.js')),
  );

  it('works', async () => {
    const process = new LocalMonitoredProcess(cmd);
    const res = await process.run().pipe(toArray()).toPromise();
    expect(res).toEqual([0]);
  });

  it('captures stdout', async () => {
    const process = new LocalMonitoredProcess(cmd);
    const stdoutOutput: string[] = [];
    process.stdout$.subscribe(data => stdoutOutput.push(data.toString()));
    await process.run().pipe().toPromise();
    expect(stdoutOutput).toEqual(['stdout start\n', 'stdout end\n']);
  });

  it('captures stderr', async () => {
    const process = new LocalMonitoredProcess(cmd);
    const stdoutOutput: string[] = [];
    process.stderr$.subscribe(data => stdoutOutput.push(data.toString()));
    await process.run().pipe().toPromise();
    expect(stdoutOutput).toEqual(['stderr start\n', 'stderr end\n']);
  });

  it('captures stats', async () => {
    const process = new LocalMonitoredProcess(cmd);
    const statsOutput: string[] = [];
    process.stderr$.subscribe(data => statsOutput.push(data.toString()));
    await process.run().pipe().toPromise();
    expect(statsOutput.length).toBeGreaterThan(0);
  });
});
