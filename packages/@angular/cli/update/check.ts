import * as path from 'path';
import * as https from 'https';
import {lt} from 'semver';
const SilentError = require('silent-error');

const ONE_HOUR = 3600000;
const ONE_DAY = ONE_HOUR * 24;
const ONE_WEEK = ONE_DAY * 7;

export interface CheckOptions {
  includeUnstable: boolean;
}

export interface CheckResult {
  currentVersion: string;
  newVersion?: string;
}

export function timeToCheck(lastChecked: Date, frequency: string): boolean {
  const freq = frequency || '1d';
  if (freq.toLowerCase() === 'never') {
    return false;
  } else if (freq.toLowerCase() === 'always') {
    return true;
  }
  if (!lastChecked) {
    lastChecked = new Date(0);
  }
  const diff = Math.abs(lastChecked.valueOf() - new Date().valueOf());
  const threshold = convertFrequency(freq);
  return diff > threshold;
}

export function newVersionAvailable(
  rootDir: string,
  name: string,
  options?: CheckOptions): Promise<CheckResult> {
  return Promise.all([
      getLocalVersion(rootDir, name),
      getRemoteVersion(name, options)
    ])
    .then(([localVersion, remoteVersion]) => {
      const newer = lt(localVersion, remoteVersion);
      const result: CheckResult = {
        currentVersion: localVersion
      };
      if (newer) {
        result.newVersion = remoteVersion;
      }
      return result;
    });
}

function encodePackageName(name: string): string {
  let encoded = encodeURIComponent(name);
  if (name.startsWith('@')) {
    encoded = `@${encoded.substr(3)}`;
  }
  return encoded;
}

function getRemoteVersion(name: string, options?: CheckOptions): Promise<string> {
  const url = `https://registry.npmjs.org/${encodePackageName(name)}`;
  return httpsGet(url)
    .then(resp => {
      const version = options.includeUnstable ?
        resp['dist-tags'].next :
        resp['dist-tags'].latest;
      return version;
    });
}

function getLocalVersion(rootDir: string, name: string): Promise<string> {
  const packagePath = path.resolve(rootDir, 'node_modules', name, 'package.json');
  try {
    const version = require(packagePath).version;
    return Promise.resolve(version);
  } catch (err) {
    return Promise.reject(new SilentError(err.message));
  }
}

function httpsGet(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get((<any>url), (res) => {
      const { statusCode } = res;
      const contentType = res.headers['content-type'];

      let error;
      if (statusCode !== 200) {
        error = new Error(`Request Failed. Status Code: ${statusCode}`);
      } else if (!/^application\/json/.test(contentType)) {
        error = new Error(
          `Invalid content-type. Expected application/json but received ${contentType}`);
      }
      if (error) {
        reject(error.message);
        // consume response data to free up memory
        res.resume();
        return;
      }

      res.setEncoding('utf8');
      let rawData = '';
      res.on('data', (chunk) => {
        rawData += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = JSON.parse(rawData);
          resolve(parsedData);
        } catch (e) {
          reject(e.message);
        }
      });
    }).on('error', (e) => {
      reject(e.message);
    });
  });
}

function convertFrequency(frequency: string): number {
  const value = parseFloat(frequency.substring(0, frequency.length - 1));
  const unit = frequency[frequency.length - 1];
  let factor = 1;
  switch (unit.toLowerCase()) {
    case 'h':
      factor = ONE_HOUR;
      break;
    case 'w':
      factor = ONE_WEEK;
      break;
    default:
      factor = ONE_DAY;
      break;
  }

  return value * factor;
}
