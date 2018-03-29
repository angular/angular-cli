require('../lib/bootstrap-local');

const path = require('path');
const chalk = require('chalk');
const spdxSatisfies = require('spdx-satisfies');
const { logging } = require('@angular-devkit/core');
const Logger = logging.Logger;
const filter = require('rxjs/operators').filter;

// Configure logger
const logger = new Logger('test-licenses');

logger.subscribe((entry) => {
  let color = chalk.white;
  let output = process.stdout;
  switch (entry.level) {
    case 'info': color = chalk.white; break;
    case 'warn': color = chalk.yellow; break;
    case 'error': color = chalk.red; output = process.stderr; break;
    case 'fatal': color = (x) => chalk.bold(chalk.red(x)); output = process.stderr; break;
  }

  output.write(color(entry.message) + '\n');
});

logger
  .pipe(filter((entry) => entry.level === 'fatal'))
  .subscribe(() => {
    process.stderr.write('A fatal error happened. See details above.');
    process.exit(1);
  });


/**
 * A general note on some black listed specific licenses:
 * - CC0
 *    This is not a valid license. It does not grant copyright of the code/asset, and does not
 *    resolve patents or other licensed work. The different claims also have no standing in court
 *    and do not provide protection to or from Google and/or third parties.
 *    We cannot use nor contribute to CC0 licenses.
 * - Public Domain
 *    Same as CC0, it is not a valid license.
 */
const licensesWhitelist = [
  // Regular valid open source licenses supported by Google.
  'MIT',
  'ISC',
  'Apache-2.0',

  'BSD-2-Clause',
  'BSD-3-Clause',
  'BSD-4-Clause',

  // All CC-BY licenses have a full copyright grant and attribution section.
  'CC-BY-3.0',
  'CC-BY-4.0',

  // Have a full copyright grant. Validated by opensource team.
  'Unlicense',

  // Combinations.
  '(AFL-2.1 OR BSD-2-Clause)',
  '(MIT OR CC-BY-3.0)',
  '(MIT OR Apache-2.0)',
];

// Name variations of SPDX licenses that some packages have.
// Licenses not included in SPDX but accepted will be converted to MIT.
const licenseReplacements = {
  // Just a longer string that our script catches. SPDX official name is the shorter one.
  'Apache License, Version 2.0': 'Apache-2.0',
  'Apache2': 'Apache-2.0',
  'AFLv2.1': 'AFL-2.1',
  // BSD is BSD-2-clause by default.
  'BSD': 'BSD-2-Clause',
};

// Specific packages to ignore, add a reason in a comment. Format: package-name@version.
const ignoredPackages = [
  'spdx-license-ids@2.0.1',  // CC0 but it's content only (index.json, no code) and not distributed.
  'spdx-license-ids@3.0.0',  // CC0 but it's content only (index.json, no code) and not distributed.
  'map-stream@0.1.0', // MIT, license but it's not listed in package.json.
  'xmldom@0.1.27', // LGPL,MIT but has a broken licenses array.
  'true-case-path@1.0.2', // Apache-2.0 but broken license in package.json
  'pako@1.0.6', // SPDX expression (MIT AND Zlib) in package.json
  'sha.js@2.4.11', // SPDX expression (MIT AND BSD-3-Clause) in package.json

  'jsonify@0.0.0', // TODO(hansl): fix this. this is not an acceptable license, but is 8 deps down
                   // so hard to manage. In talk with owner and users to switch over.
];

// Find all folders directly under a `node_modules` that have a package.json.
const checker = require('license-checker');

checker.init({ start: path.join(__dirname, '..') }, (err, json) => {
  if (err) {
    logger.fatal(`Something happened:\n${err.message}`);
  } else {
    logger.info(`Testing ${Object.keys(json).length} packages.\n`);

    // Packages with bad licenses are those that neither pass SPDX nor are ignored.
    const badLicensePackages = Object.keys(json)
      .map(key => {
        return {
          id: key,
          licenses: []
            .concat(json[key].licenses)
            .map(x => x.replace(/\*$/, ''))  // `*` is used when the license is guessed.
            .map(x => x in licenseReplacements ? licenseReplacements[x] : x),
        };
      })
      .filter(pkg => !passesSpdx(pkg.licenses, licensesWhitelist))
      .filter(pkg => !ignoredPackages.find(ignored => ignored === pkg.id));

    // Report packages with bad licenses
    if (badLicensePackages.length > 0) {
      logger.error('Invalid package licences found:');
      badLicensePackages.forEach(pkg => logger.error(`${pkg.id}: ${JSON.stringify(pkg.licenses)}`));
      logger.fatal(`\n${badLicensePackages.length} total packages with invalid licenses.`);
    } else {
      logger.info('All package licenses are valid.');
    }
  }
});

// Check if a license is accepted by an array of accepted licenses
function passesSpdx(licenses, accepted) {
  return accepted.some(l => {
    try {
      return spdxSatisfies(licenses.join(' AND '), l);
    } catch (_) {
      return false;
    }
  });
}
