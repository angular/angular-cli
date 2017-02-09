const licenseChecker = require('license-checker');
const spdxSatisfies = require('spdx-satisfies');
const denodeify = require('denodeify');
const licenseCheckerInit = denodeify(licenseChecker.init);


// SPDX defined licenses, see https://spdx.org/licenses/.
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
const ignoredLicenseVariations = [
  'MIT*',
  'MIT/X11',
  'AFLv2.1',
  'AFLv3.0',
  'Apache-2.0',
  'Apache2',
  'BSD',
  'BSD*',
  'BSD-like',
  'NPL',
  'L/GPL',
  'Public Domain'
];

// Specific packages to ignore, add a reason in a comment. Format: package-name@version.
const ignoredPackages = [
  'json-schema@0.2.3', // old license format, lists `AFLv2.1, BSD`
  'pause-stream@0.0.11', // old license format, lists `MIT, Apache2`
  'rx-lite@3.1.2' // `Apache License, Version 2.0`, but licence-checker can't handle commas
];

function testSpdx(licenses) {
  try {
    return spdxSatisfies(licenses, `(${acceptedSpdxLicenses.join(' OR ')})`)
  } catch (_) {
    return false;
  }
}

// Use license-checker first, it can filter more licenses.
licenseCheckerInit({
  start: './',
  exclude: acceptedSpdxLicenses.concat(ignoredLicenseVariations).join(),
  customFormat: { name: '', _location: '' }
})
  .then(json => {
    let badPackages = Object.keys(json)
      .map(key => Object.assign({}, json[key], { id: key }))
      // Then run the remaining ones through spdx-satisfies.
      .filter(pkg => !testSpdx(pkg.licenses))
      .filter(pkg => !ignoredPackages.find(ignored => ignored === pkg.id));

    if (badPackages.length > 0) {
      console.log('Invalid package licences found:\n');
      badPackages.forEach(pkg => console.log(`- ${pkg.id} (${pkg._location}): ${pkg.licenses}`));
      process.exit(1);
    } else {
      console.log('All package licenses are valid.');
    }
  })
  .catch(err => {
    console.log(err);
    process.exit(1);
  });
