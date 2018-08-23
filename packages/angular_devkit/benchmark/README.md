# Angular Devkit Benchmark

This tool provides benchmark information for processes.
The tool will gathering metrics from a given command, then average them out over the total runs.

It currently shows only time, process, cpu, and memory used but might be extended in the future.

This tool was created to provide an objective and reproducible way of benchmarking process
performance.

Given a process (or its source code), process inputs and environment, keeping two of these elements
constant while varying the third should allow for meaningful benchmarks over time.

In the context of the DevKit, we publish many CLI tools and have access to their source code.
By tracking tool resource usage we can catch performance regressions or improvements on our CI.


## STABILITY AND SUPPORT DISCLAIMER

This package is not currently stable. Usage, output and API may change at any time.
Support is not ensured.

## Installation

You can install the benchmark tool via `npm install -g benchmark` for a global install, or without
`-g` for a local install.
Installing globally gives you access to the `benchmark` binary in your `PATH`.


## CLI Usage

Call the `benchmark` binary, followed by options, then double dash, then the command to benchmark.

For more information on the available options, run `benchmark --help`:
```
$ benchmark --help
[benchmark] benchmark [options] -- [command to benchmark]

Collects process stats from running the command.

Options:
    --help                    Show this message.
    (... other available options)

Example:
    benchmark --iterations=3 -- node my-script.js
```


## Example

Given the naive implementation of a fibonacci number calculator below:
```
// fibonacci.js
const fib = (n) => n > 1 ? fib(n - 1) + fib(n - 2) : n;
console.log(fib(parseInt(process.argv[2])));
```

Run `benchmark -- node fibonacci.js 40` to benchmark calculating the 40th fibonacci number:

```
$ benchmark -- node fibonacci.js 40
[benchmark] Benchmarking process over 5 iterations, with up to 5 retries.
[benchmark]   node fibonacci.js 40 (at D:\sandbox\latest-project)
[benchmark] Process Stats
[benchmark]   Elapsed Time: 2365.40 ms (2449.00, 2444.00, 2357.00, 2312.00, 2265.00)
[benchmark]   Average Process usage: 1.00 process(es) (1.00, 1.00, 1.00, 1.00, 1.00)
[benchmark]   Peak Process usage: 1.00 process(es) (1.00, 1.00, 1.00, 1.00, 1.00)
[benchmark]   Average CPU usage: 4.72 % (5.03, 4.86, 4.50, 4.50, 4.69)
[benchmark]   Peak CPU usage: 23.40 % (25.00, 23.40, 21.80, 21.80, 25.00)
[benchmark]   Average Memory usage: 22.34 MB (22.32, 22.34, 22.34, 22.35, 22.35)
[benchmark]   Peak Memory usage: 22.34 MB (22.32, 22.34, 22.34, 22.35, 22.35)
```


## API Usage

You can also use the benchmarking API directly:

```
import { Command, defaultStatsCapture, runBenchmark } from '@angular-devkit/benchmark';

const command = new Command('node', ['fibonacci.js', '40']);
const captures = [defaultStatsCapture];

runBenchmark({ command, command }).subscribe(results => {
  // results is:[{
  //   "name": "Process Stats",
  //   "metrics": [{
  //     "name": "Elapsed Time", "unit": "ms", "value": 1883.6,
  //     "componentValues": [1733, 1957, 1580, 1763, 2385]
  //   }, {
  //     "name": "Average Process usage", "unit": "process(es)", "value": 1,
  //     "componentValues": [1, 1, 1, 1, 1]
  //   }, {
  //     "name": "Peak Process usage", "unit": "process(es)", "value": 1,
  //     "componentValues": [1, 1, 1, 1, 1]
  //   }, {
  //     "name": "Average CPU usage", "unit": "%", "value": 3.0855555555555556,
  //     "componentValues": [1.9625, 1.9500000000000002, 1.9500000000000002, 4.887499999999999, 4.677777777777778]
  //   }, {
  //     "name": "Peak CPU usage", "unit": "%", "value": 19.380000000000003,
  //     "componentValues": [15.7, 15.6, 15.6, 25, 25]
  //   }, {
  //     "name": "Average Memory usage", "unit": "MB", "value": 22.364057600000002,
  //     "componentValues": [22.383104, 22.332416, 22.401024, 22.355968, 22.347776]
  //   }, {
  //     "name": "Peak Memory usage", "unit": "MB", "value": 22.3649792,
  //     "componentValues": [22.384639999999997, 22.335487999999998, 22.401024, 22.355968, 22.347776]
  //   }]
  // }]
});
```

A good example of API usage is the `main` binary itself, found in `./src/main.ts`.
We recommend using TypeScript to get full access to the interfaces included.