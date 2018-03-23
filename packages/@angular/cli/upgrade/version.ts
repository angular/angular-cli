import { SemVer, satisfies } from 'semver';
import chalk from 'chalk';
import { stripIndents, stripIndent } from 'common-tags';
import * as path from 'path';
import { isWarningEnabled } from '../utilities/config';
import { requireProjectModule } from '../utilities/require-project-module';

const resolve = require('resolve');


const { bold, red, yellow } = chalk;


export class Version {
  private _semver: SemVer = null;
  constructor(private _version: string = null) {
    this._semver = _version && new SemVer(_version);
  }

  isAlpha() { return this.qualifier == 'alpha'; }
  isBeta() { return this.qualifier == 'beta'; }
  isReleaseCandidate() { return this.qualifier == 'rc'; }
  isKnown() { return this._version !== null; }

  isLocal() { return this.isKnown() && path.isAbsolute(this._version); }
  isGreaterThanOrEqualTo(other: SemVer) {
    return this._semver.compare(other) >= 0;
  }

  get major() { return this._semver ? this._semver.major : 0; }
  get minor() { return this._semver ? this._semver.minor : 0; }
  get patch() { return this._semver ? this._semver.patch : 0; }
  get qualifier() { return this._semver ? this._semver.prerelease[0] : ''; }
  get extra() { return this._semver ? this._semver.prerelease[1] : ''; }

  toString() { return this._version; }

  static fromProject(): Version {
    let packageJson: any = null;

    try {
      const angularCliPath = resolve.sync('@angular/cli', {
        basedir: process.cwd(),
        packageFilter: (pkg: any, _pkgFile: string) => {
          return packageJson = pkg;
        }
      });
      if (angularCliPath && packageJson) {
        try {
          return new Version(packageJson.version);
        } catch {
          return new Version(null);
        }
      }
    } catch {
      return new Version(null);
    }
  }

  static assertCompatibleAngularVersion(projectRoot: string) {
    let angularPkgJson;
    let rxjsPkgJson;
    try {
      angularPkgJson = requireProjectModule(projectRoot, '@angular/core/package.json');
      rxjsPkgJson = requireProjectModule(projectRoot, 'rxjs/package.json');
    } catch {
      console.error(bold(red(stripIndents`
        You seem to not be depending on "@angular/core" and/or "rxjs". This is an error.
      `)));
      process.exit(2);
    }

    if (!(angularPkgJson && angularPkgJson['version'] && rxjsPkgJson && rxjsPkgJson['version'])) {
      console.error(bold(red(stripIndents`
        Cannot determine versions of "@angular/core" and/or "rxjs".
        This likely means your local installation is broken. Please reinstall your packages.
      `)));
      process.exit(2);
    }

    let angularVersion = new Version(angularPkgJson['version']);
    let rxjsVersion = new Version(rxjsPkgJson['version']);

    if (angularVersion.isLocal()) {
      console.warn(yellow('Using a local version of angular. Proceeding with care...'));
      return;
    }

    if (!angularVersion.isGreaterThanOrEqualTo(new SemVer('5.0.0'))) {
      console.error(bold(red(stripIndents`
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
      console.error(bold(red(stripIndents`
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
      console.warn(bold(red(stripIndents`
          This project uses a temporary compatibility version of RxJs (${rxjsVersion}.

          Please visit the link below to find instructions on how to update RxJs.
          https://docs.google.com/document/d/12nlLt71VLKb-z3YaSGzUfx6mJbc34nsMXtByPUN35cg/edit#
        ` + '\n')));
    }
  }

  static assertTypescriptVersion(projectRoot: string) {
    if (!isWarningEnabled('typescriptMismatch')) {
      return;
    }
    let compilerVersion: string, tsVersion: string;
    try {
      compilerVersion = requireProjectModule(projectRoot, '@angular/compiler-cli').VERSION.full;
      tsVersion = requireProjectModule(projectRoot, 'typescript').version;
    } catch {
      console.error(bold(red(stripIndents`
        Versions of @angular/compiler-cli and typescript could not be determined.
        The most common reason for this is a broken npm install.

        Please make sure your package.json contains both @angular/compiler-cli and typescript in
        devDependencies, then delete node_modules and package-lock.json (if you have one) and
        run npm install again.
      `)));
      process.exit(2);
    }

    const versionCombos = [
      { compiler: '>=2.3.1 <3.0.0', typescript: '>=2.0.2 <2.3.0' },
      { compiler: '>=4.0.0-beta.0 <5.0.0', typescript: '>=2.1.0 <2.4.0' },
      { compiler: '>=5.0.0-beta.0 <5.1.0', typescript: '>=2.4.2 <2.5.0' },
      { compiler: '>=5.1.0-beta.0 <5.2.0', typescript: '>=2.4.2 <2.6.0' },
      { compiler: '>=5.2.0-beta.0 <6.0.0', typescript: '>=2.4.2 <2.7.0' },
      { compiler: '>=6.0.0-beta.0 <7.0.0', typescript: '>=2.7.0 <2.8.0' },
    ];

    const currentCombo = versionCombos.find((combo) => satisfies(compilerVersion, combo.compiler));

    if (currentCombo && !satisfies(tsVersion, currentCombo.typescript)) {
      // First line of warning looks weird being split in two, disable tslint for it.
      console.log((yellow('\n' + stripIndent`
        @angular/compiler-cli@${compilerVersion} requires typescript@'${
        currentCombo.typescript}' but ${tsVersion} was found instead.
        Using this version can result in undefined behaviour and difficult to debug problems.

        Please run the following command to install a compatible version of TypeScript.

            npm install typescript@'${currentCombo.typescript}'

        To disable this warning run "ng set warnings.typescriptMismatch=false".
      ` + '\n')));
    }
  }

}
