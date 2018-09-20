/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Observable } from 'rxjs';
import { toArray } from 'rxjs/operators';
import { defaultStatsCapture } from './default-stats-capture';
import { AggregatedProcessStats, MonitoredProcess } from './interfaces';


describe('defaultStatsCapture', () => {
  it('works', async () => {
    const stats$ = new Observable<AggregatedProcessStats>(obs => {
      const ignoredStats = { ppid: 1, pid: 1, ctime: 1, timestamp: 1 };
      obs.next({
        processes: 1, cpu: 0, memory: 10 * 1e6, elapsed: 1000,
        ...ignoredStats,
      });
      obs.next({
        processes: 3, cpu: 40, memory: 2 * 1e6, elapsed: 2000,
        ...ignoredStats,
      });
      obs.next({
        processes: 5, cpu: 20, memory: 3 * 1e6, elapsed: 3000,
        ...ignoredStats,
      });
      obs.complete();
    });
    const process = { stats$ } as {} as MonitoredProcess;

    const res = await defaultStatsCapture(process).pipe(toArray()).toPromise();
    expect(res).toEqual([{
      name: 'Process Stats',
      metrics: [
        { name: 'Elapsed Time', unit: 'ms', value: 3000 },
        { name: 'Average Process usage', unit: 'process(es)', value: 3 },
        { name: 'Peak Process usage', unit: 'process(es)', value: 5 },
        { name: 'Average CPU usage', unit: '%', value: 20 },
        { name: 'Peak CPU usage', unit: '%', value: 40 },
        { name: 'Average Memory usage', unit: 'MB', value: 5 },
        { name: 'Peak Memory usage', unit: 'MB', value: 10 },
      ],
    }]);
  });
});
