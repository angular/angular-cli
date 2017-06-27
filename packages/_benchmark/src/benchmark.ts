/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
declare let global: any;


const kNanosecondsPerSeconds = 1e9;


function _run(fn: () => void, collector: number[]) {
  const timeout = Date.now();
  for (let i = 0; i < 10000 && (Date.now() - timeout) < 5000; i++) {
    // Start time.
    const start = process.hrtime();
    fn();
    // Get the stop difference time.
    const diff = process.hrtime(start);

    // Add to metrics.
    collector.push(diff[0] * kNanosecondsPerSeconds + diff[1]);
  }
}


function _stats(metrics: number[]) {
  metrics.sort((a, b) => a - b);

  const middle = metrics.length / 2;
  const mean = Number.isInteger(middle)
    ? metrics[middle] : ((metrics[middle - 0.5] + metrics[middle + 0.5]) / 2);
  const total = metrics.reduce((acc, curr) => acc + curr, 0);
  const average = total / metrics.length;

  return {
    slowest: metrics.slice(-5).reverse(),
    fastest: metrics.slice(0, 5),
    mean,
    average
  };
}


export function benchmark(name: string, fn: () => void, base?: () => void) {
  it(name + ' (time in nanoseconds)', (done) => {
    process.nextTick(() => {
      for (let i = 0; i < 100; i++) {
        // Warm it up.
        fn();
      }

      const reporter: any = global.benchmarkReporter;
      const metrics: number[] = [];
      const baseMetrics: number[] = [];

      // Gather the first 5 seconds runs, or 10000 runs whichever comes first (soft timeout).
      _run(fn, metrics);
      if (base) {
        _run(base, baseMetrics);
      }

      reporter.reportBenchmark({
        ..._stats(metrics),
        base: base ? _stats(baseMetrics) : null
      });

      done();
    });
  });
}
