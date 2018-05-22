/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export interface BuildKarmaOptions {
  successCb: () => void;
  failureCb: () => void;
}

interface KarmaReporter {
  (...args: any[]): void; // tslint:disable-line:no-any
  $inject?: string[];
}

interface KarmaReporterThis {
  onRunComplete: (browsers: string[], results: { exitCode: number }) => void;
  write(str: string): void;
}

// Emits builder events.
const eventReporter: KarmaReporter = function KarmaReporter(
  this: KarmaReporterThis,
  buildKarma: BuildKarmaOptions,
  baseReporterDecorator: (reporter: KarmaReporterThis) => void,
) {
  baseReporterDecorator(this);

  this.onRunComplete = function (_browsers, results) {

    if (buildKarma
      && buildKarma.successCb
      && buildKarma.failureCb
    ) {
      if (results.exitCode === 0) {
        buildKarma.successCb();
      } else {
        buildKarma.failureCb();
      }
    } else {
      this.write(`WARNING: The '@angular-devkit/build-karma' reporter is meant to be used `
        + ` with the '@angular-devkit/build-karma' Architect builder.`);
    }
  };
};

eventReporter.$inject = ['config.buildKarma', 'baseReporterDecorator'];

module.exports = {
  'reporter:@angular-devkit/build-karma': ['type', eventReporter],
};
