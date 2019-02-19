/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { tags, terminal } from '@angular-devkit/core';
import { resolve } from '@angular-devkit/core/node';
import * as path from 'path';
import { SemVer } from 'semver';


export class Version {
  private _semver: SemVer | null = null;
  constructor(private _version: string | null = null) {
    this._semver = _version ? new SemVer(_version) : null;
  }

  isAlpha() { return this.qualifier == 'alpha'; }
  isBeta() { return this.qualifier == 'beta'; }
  isReleaseCandidate() { return this.qualifier == 'rc'; }
  isKnown() { return this._version !== null; }

  isLocal() { return this.isKnown() && this._version && path.isAbsolute(this._version); }
  isGreaterThanOrEqualTo(other: SemVer) {
    return this._semver !== null && this._semver.compare(other) >= 0;
  }

  get major() { return this._semver ? this._semver.major : 0; }
  get minor() { return this._semver ? this._semver.minor : 0; }
  get patch() { return this._semver ? this._semver.patch : 0; }
  get qualifier() { return this._semver ? this._semver.prerelease[0] : ''; }
  get extra() { return this._semver ? this._semver.prerelease[1] : ''; }

  toString() { return this._version; }

  static assertCompatibleAngularVersion(projectRoot: string) {
    let angularPkgJson;
    let rxjsPkgJson;

    try {
      const resolveOptions = {
        basedir: projectRoot,
        checkGlobal: false,
        checkLocal: true,
      };
      const angularPackagePath = resolve('@angular/core/package.json', resolveOptions);
      const rxjsPackagePath = resolve('rxjs/package.json', resolveOptions);

      angularPkgJson = require(angularPackagePath);
      rxjsPkgJson = require(rxjsPackagePath);
    } catch {
      console.error(terminal.bold(terminal.red(tags.stripIndents`
        You seem to not be depending on "@angular/core" and/or "rxjs". This is an error.
      `)));
      process.exit(2);
    }

    if (!(angularPkgJson && angularPkgJson['version'] && rxjsPkgJson && rxjsPkgJson['version'])) {
      console.error(terminal.bold(terminal.red(tags.stripIndents`
        Cannot determine versions of "@angular/core" and/or "rxjs".
        This likely means your local installation is broken. Please reinstall your packages.
      `)));
      process.exit(2);
    }

    const angularVersion = new Version(angularPkgJson['version']);
    const rxjsVersion = new Version(rxjsPkgJson['version']);

    if (angularVersion.isLocal()) {
      console.error(terminal.yellow('Using a local version of angular. Proceeding with care...'));

      return;
    }

    if (!angularVersion.isGreaterThanOrEqualTo(new SemVer('5.0.0'))) {
      console.error(terminal.bold(terminal.red(tags.stripIndents`
          This version of CLI is only compatible with Angular version 5.0.0 or higher.

          Please visit the link below to find instructions on how to update Angular.
          https://angular-update-guide.firebaseapp.com/
        ` + '\n')));
      process.exit(3);
    } else if (
      angularVersion.isGreaterThanOrEqualTo(new SemVer('6.0.0-rc.0'))
      && !rxjsVersion.isGreaterThanOrEqualTo(new SemVer('5.6.0-forward-compat.0'))
      && !rxjsVersion.isGreaterThanOrEqualTo(new SemVer('6.0.0-beta.0'))
    ) {
      console.error(terminal.bold(terminal.red(tags.stripIndents`
          This project uses version ${rxjsVersion} of RxJs, which is not supported by Angular v6.
          The official RxJs version that is supported is 5.6.0-forward-compat.0 and greater.

          Please visit the link below to find instructions on how to update RxJs.
          https://docs.google.com/document/d/12nlLt71VLKb-z3YaSGzUfx6mJbc34nsMXtByPUN35cg/edit#
        ` + '\n')));
      process.exit(3);
    } else if (
      angularVersion.isGreaterThanOrEqualTo(new SemVer('6.0.0-rc.0'))
      && !rxjsVersion.isGreaterThanOrEqualTo(new SemVer('6.0.0-beta.0'))
    ) {
      console.warn(terminal.bold(terminal.red(tags.stripIndents`
          This project uses a temporary compatibility version of RxJs (${rxjsVersion}).

          Please visit the link below to find instructions on how to update RxJs.
          https://docs.google.com/document/d/12nlLt71VLKb-z3YaSGzUfx6mJbc34nsMXtByPUN35cg/edit#
        ` + '\n')));
    }
  }

}
