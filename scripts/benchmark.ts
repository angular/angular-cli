/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import 'jasmine';

import {yellow} from 'chalk';
import * as glob from 'glob';
import {SpecReporter as JasmineSpecReporter} from 'jasmine-spec-reporter';
import {join, relative} from 'path';


const Jasmine = require('jasmine');

const projectBaseDir = join(__dirname, '../packages');
require('source-map-support').install({
  hookRequire: true
});


declare let global: any & {
  benchmarkReporter: any;
};


interface BenchmarkResult {
  slowest: number[];
  fastest: number[];
  mean: number;
  average: number;

  base?: BenchmarkResult;
}


class BenchmarkReporter extends JasmineSpecReporter implements jasmine.CustomReporter {
  private _stats: BenchmarkResult | null;

  constructor() {
    super({
      summary: {}
    });
  }

  reportBenchmark(stats: BenchmarkResult) {
    this._stats = stats;
  }

  jasmineStarted(suiteInfo: jasmine.SuiteInfo): void {
    super.jasmineStarted(suiteInfo);
  }
  suiteStarted(result: jasmine.CustomReporterResult): void {
    super.suiteStarted(result);
  }
  specStarted(result: jasmine.CustomReporterResult): void {
    super.specStarted(result);
    this._stats = null;
  }
  specDone(result: jasmine.CustomReporterResult): void {
    super.specDone(result);
    if (result.status == 'passed' && this._stats) {
      const stat = this._stats;
      const padding = '             ';

      function pad(x: string | number, p: string = padding): string {
        const s = ('' + x).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        return p.substr(0, p.length - ('' + s).length) + s;
      }

      const fastest = stat.fastest.map(x => pad(x)).join('');
      const slowest = stat.slowest.map(x => pad(x)).join('');
      const mean = pad(Math.floor(stat.mean));
      const average = pad(Math.floor(stat.average));
      if (stat.base) {
        const precision = (x: number) => ('' + Math.floor(x * 100)).replace(/(\d\d)$/, '.$1');
        const multPad = '      ';
        const baseFastest = stat.base.fastest.map(x => pad(x)).join('');
        const baseSlowest = stat.base.slowest.map(x => pad(x)).join('');
        const baseMean = pad(Math.floor(stat.base.mean));
        const baseMeanMult = pad(precision(stat.mean / stat.base.mean), multPad);
        const baseAverage = pad(Math.floor(stat.base.average));
        const baseAverageMult = pad(precision(stat.average / stat.base.average), multPad);

        console.log(yellow(`      fastest: ${fastest}`));
        console.log(yellow(`        (base) ${baseFastest}`));
        console.log(yellow(`      slowest: ${slowest}`));
        console.log(yellow(`        (base) ${baseSlowest}`));
        console.log(yellow(`      mean:    ${mean} (${baseMean}) (${baseMeanMult}x)`));
        console.log(yellow(`      average: ${average} (${baseAverage}) (${baseAverageMult}x)`));
      } else {
        console.log(yellow(`      fastest: ${fastest}`));
        console.log(yellow(`      slowest: ${slowest}`));
        console.log(yellow(`      mean:    ${mean}`));
        console.log(yellow(`      average: ${average}`));
      }
    }
  }
  suiteDone(result: jasmine.CustomReporterResult): void {
    super.suiteDone(result);
  }
  jasmineDone(runDetails: jasmine.RunDetails): void {
    super.jasmineDone(runDetails);
  }
}


// Create a Jasmine runner and configure it.
const runner = new Jasmine({ projectBaseDir: projectBaseDir });

runner.env.clearReporters();
global.benchmarkReporter = new BenchmarkReporter();
runner.env.addReporter(global.benchmarkReporter);


// Manually set exit code (needed with custom reporters)
runner.onComplete((success: boolean) => {
  process.exitCode = success ? 0 : 1;
});


// Run the tests.
const allTests =
  glob.sync('packages/**/*_benchmark.ts')
    .map(p => relative(projectBaseDir, p))
    .filter(p => !/schematics_cli\/schematics\//.test(p));


export default function(_args: any) {
  runner.execute(allTests);
}
