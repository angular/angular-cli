/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
declare const global: {
  benchmarkReporter: {
    reportBenchmark: Function,
  },
};


const kNanosecondsPerSeconds = 1e9;
const kBenchmarkIterationMaxCount = 10000;
const kBenchmarkTimeoutInMsec = 5000;
const kWarmupIterationCount = 100;
const kTopMetricCount = 5;


function _run(fn: (i: number) => void, collector: number[]) {
  const timeout = Date.now();
  // Gather the first 5 seconds runs, or kMaxNumberOfIterations runs whichever comes first
  // (soft timeout).
  for (let i = 0;
       i < kBenchmarkIterationMaxCount && (Date.now() - timeout) < kBenchmarkTimeoutInMsec;
       i++) {
    // Start time.
    const start = process.hrtime();
    fn(i);
    // Get the stop difference time.
    const diff = process.hrtime(start);

    // Add to metrics.
    collector.push(diff[0] * kNanosecondsPerSeconds + diff[1]);
  }
}


function _stats(metrics: number[]) {
  metrics.sort((a, b) => a - b);

  const count = metrics.length;
  const middle = count / 2;
  const mean = Number.isInteger(middle)
    ? metrics[middle] : ((metrics[middle - 0.5] + metrics[middle + 0.5]) / 2);
  const total = metrics.reduce((acc, curr) => acc + curr, 0);
  const average = total / count;

  return {
    count: count,
    fastest: metrics.slice(0, kTopMetricCount),
    slowest: metrics.reverse().slice(0, kTopMetricCount),
    mean,
    average,
  };
}


export function benchmark(name: string, fn: (i: number) => void, base?: (i: number) => void) {
  it(name + ' (time in nanoseconds)', (done) => {
    process.nextTick(() => {
      for (let i = 0; i < kWarmupIterationCount; i++) {
        // Warm it up.
        fn(i);
      }

      const reporter = global.benchmarkReporter;
      const metrics: number[] = [];
      const baseMetrics: number[] = [];

      _run(fn, metrics);
      if (base) {
        _run(base, baseMetrics);
      }

      reporter.reportBenchmark({
        ..._stats(metrics),
        base: base ? _stats(baseMetrics) : null,
      });

      done();
    });
  });
}
