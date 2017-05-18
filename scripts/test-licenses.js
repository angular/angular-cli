require('../lib/bootstrap-local');

const path = require('path');
const glob = require('glob');
const chalk = require('chalk');
const spdxSatisfies = require('spdx-satisfies');
const Logger = require('@ngtools/logger').Logger;
require('rxjs/add/operator/filter');

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
  .filter((entry) => entry.level == 'fatal')
  .subscribe(() => {
    process.stderr.write('A fatal error happened. See details above.');
    process.exit(1);
  });

// SPDX defined licenses, see https://spdx.org/licenses/.
// TODO(hansl): confirm this list
const acceptedSpdxLicenses = [
  'MIT',
  'ISC',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'BSD-4-Clause',
  'CC-BY-3.0',
  'CC-BY-4.0',
  'Beerware',
  'Unlicense'
];

// Name variations of SPDX licenses that some packages have.
// Licenses not included in SPDX but accepted will be converted to MIT.
// TODO(hansl): make sure all of these are ok
const licenseReplacements = [
  { name: 'Apache License, Version 2.0', replacement: 'Apache-2.0' },
  { name: 'AFLv2.1', replacement: 'AFL-2.1' },
  // I guess these are kinda the same?
  { name: 'BSD', replacement: 'BSD-2-Clause' },
  { name: 'BSD-like', replacement: 'BSD-2-Clause' },
  { name: 'MIT/X11', replacement: 'MIT' },
  // Not sure how to deal with public domain.
  // http://wiki.spdx.org/view/Legal_Team/Decisions/Dealing_with_Public_Domain_within_SPDX_Files
  { name: 'Public Domain', replacement: 'MIT' }
];

// Specific packages to ignore, add a reason in a comment. Format: package-name@version.
// TODO(hansl): review these
const ignoredPackages = [
  'async-foreach@0.1.3', // MIT, but doesn't list it in package.json
  'buffer-indexof@1.1.0', // MIT, but doesn't list it in package.json.
  'directory-encoder@0.7.2', // MIT, but doesn't list it in package.json
  'domelementtype@1.1.3', // Looks like MIT
  'domelementtype@1.3.0', // Looks like MIT
  'domhandler@2.1.0', // Looks like MIT
  'domutils@1.5.1', // Looks like MIT
  'domutils@1.1.6', // Looks like MIT
  'extsprintf@1.0.2', // Looks like MIT
  'formatio@1.1.1', // BSD, but doesn't list it in package.json
  'indexof@0.0.1', // MIT, but doesn't list it in package.json
  'jschardet@1.4.2', // LGPL-2.1, listed as LGPL-2.1+.
  'map-stream@0.1.0', // MIT, license but it's not listed in package.json.
  'mime@1.2.11', // MIT, but doesn't list it in package.json
  'ms@0.7.1', // MIT, but doesn't list it in package.json
  'pause-stream@0.0.11', // MIT AND Apache-2.0, but broken license field in package.json lists.
  'progress@1.1.8', // MIT, but doesn't list it in package.json
  'samsam@1.1.2', // BSD, but doesn't list it in package.json
  'stdout-stream@1.4.0', // MIT, but doesn't list it in package.json
  'thunky@0.1.0', // MIT, but doesn't list it in package.json.
  'uglify-js@2.3.6', // BSD, but doesn't list it in package.json
  'undefined@undefined', // Test package with no name nor version.
  'verror@1.3.6', // Looks like MIT
  'xmldom@0.1.27' // LGPL,MIT but has a broken licenses array
];

const root = path.resolve(__dirname, '../');

// Find all folders directly under a `node_modules` that have a package.json.
const allPackages = glob.sync(path.join(root, '**/node_modules/*/package.json'), { nodir: true })
  .map(packageJsonPath => {
    const packageJson = require(packageJsonPath);
    return {
      id: `${packageJson.name}@${packageJson.version}`,
      path: path.dirname(packageJsonPath),
      packageJson: packageJson
    };
  })
  // Figure out what kind of license the package uses.
  .map(pkg => {
    let license = null;
    if (pkg.packageJson.license) {
      // Use license field if present
      if (typeof pkg.packageJson.license === 'string') {
        license = replace(pkg.packageJson.license);
      } else if (typeof pkg.packageJson.license === 'object' && typeof pkg.packageJson.type) {
        license = replace(pkg.packageJson.license.type);
      }
    } else if (Array.isArray(pkg.packageJson.licenses)) {
      // If there's an (outdated) licenses array use that joined by OR.
      // TODO verify multiple licenses is OR and not AND
      license = pkg.packageJson.licenses
        .map(license => replace(license.type))
        .join(' OR ');
    }
    pkg.license = license;
    return pkg;
  })

logger.info(`Testing ${allPackages.length} packages.\n`)

// Packages with bad licenses are those that neither pass SPDX nor are ignored.
const badLicensePackages = allPackages
  .filter(pkg => !passesSpdx(pkg.license, acceptedSpdxLicenses))
  .filter(pkg => !ignoredPackages.find(ignored => ignored === pkg.id));

// Report packages with bad licenses
if (badLicensePackages.length > 0) {
  logger.error('Invalid package licences found:');
  badLicensePackages.forEach(pkg => logger.error(`${pkg.id} (${pkg.path}): ${pkg.license}`));
  logger.fatal(`\n${badLicensePackages.length} total packages with invalid licenses.`);
} else {
  logger.info('All package licenses are valid.');
}

// Check if a license is accepted by an array of accepted licenses
function passesSpdx(license, accepted) {
  try {
    return spdxSatisfies(license, `(${accepted.join(' OR ')})`)
  } catch (_) {
    return false;
  }
}

// Apply license name replacement if any
function replace(license) {
  const match = licenseReplacements.find(rpl => rpl.name === license);
  return match ? match.replacement : license;
}
