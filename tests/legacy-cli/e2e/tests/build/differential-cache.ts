import * as crypto from 'crypto';
import * as fs from 'fs';
import { rimraf, replaceInFile } from '../../utils/fs';
import { ng } from '../../utils/process';

function generateFileHashMap(): Map<string, string> {
  const hashes = new Map<string, string>();

  fs.readdirSync('./dist/test-project').forEach(name => {
    const data = fs.readFileSync('./dist/test-project/' + name);
    const hash = crypto
      .createHash('sha1')
      .update(data)
      .digest('hex');

    hashes.set(name, hash);
  });

  return hashes;
}

function validateHashes(
  oldHashes: Map<string, string>,
  newHashes: Map<string, string>,
  shouldChange: Array<string>,
): void {
  oldHashes.forEach((hash, name) => {
    if (hash === newHashes.get(name)) {
      if (shouldChange.includes(name)) {
        throw new Error(`"${name}" did not change hash (${hash})...`);
      }
    } else if (!shouldChange.includes(name)) {
      throw new Error(`"${name}" changed hash (${hash})...`);
    }
  });
}

export default async function() {
  // Skip on CI due to large variability of performance
  if (process.env['CI']) {
    return;
  }

  let oldHashes: Map<string, string>;
  let newHashes: Map<string, string>;

  // Enable Differential loading to run both size checks
  await replaceInFile(
    '.browserslistrc',
    'not IE 11',
    'IE 11',
  );

  // Remove the cache so that an initial build and build with cache can be tested
  await rimraf('./node_modules/.cache');

  let start = Date.now();
  await ng('build', '--configuration=development');
  let initial = Date.now() - start;
  oldHashes = generateFileHashMap();

  start = Date.now();
  await ng('build', '--configuration=development');
  let cached = Date.now() - start;
  newHashes = generateFileHashMap();

  validateHashes(oldHashes, newHashes, []);

  if (cached > initial * 0.70) {
    throw new Error(
      `Cached build time [${cached}] should not be greater than 70% of initial build time [${initial}].`,
    );
  }

  // Remove the cache so that an initial build and build with cache can be tested
  await rimraf('./node_modules/.cache');

  start = Date.now();
  await ng('build');
  initial = Date.now() - start;
  oldHashes = generateFileHashMap();

  start = Date.now();
  await ng('build');
  cached = Date.now() - start;
  newHashes = generateFileHashMap();

  if (cached > initial * 0.70) {
    throw new Error(
      `Cached build time [${cached}] should not be greater than 70% of initial build time [${initial}].`,
    );
  }

  validateHashes(oldHashes, newHashes, []);
}
