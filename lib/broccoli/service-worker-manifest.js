"use strict";

var diffingPlugin = require('./diffing-broccoli-plugin');
var path = require('path');
var fs = require('fs');
var crypto = require('crypto');

var FILE_ENCODING = { encoding: 'utf-8' };
var MANIFEST_FILE = 'manifest.appcache';
var FILE_HASH_PREFIX = '# sw.file.hash:';

class DiffingSWManifest {
  constructor(inputPath, cachePath, options) {
    this.inputPath = inputPath;
    this.cachePath = cachePath;
    this.options = options;
    this.firstBuild = true;
  }
  
  rebuild(diff) {
    var manifest = {};
    if (this.firstBuild) {
      this.firstBuild = false;
    } else {
      // Read manifest from disk.
      manifest = this.readManifestFromCache();
    }
    
    // Remove manifest entries for files that are no longer present.
    diff.removedPaths.forEach((file) => delete manifest[file]);
    
    // Merge the lists of added and changed paths and update their hashes in the manifest.
    []
      .concat(diff.addedPaths)
      .concat(diff.changedPaths)
      .filter((file) => file !== MANIFEST_FILE)
      .forEach((file) => manifest[file] = this.computeFileHash(file));
    var manifestPath = path.join(this.cachePath, MANIFEST_FILE);
    fs.writeFileSync(manifestPath, this.generateManifest(manifest));
  }

  // Compute the hash of the given relative file.
  computeFileHash(file) {
    var contents = fs.readFileSync(path.join(this.inputPath, file));
    return crypto
      .createHash('sha1')
      .update(contents)
      .digest('hex');
  }

  // Compute the hash of the bundle from the names and hashes of all included files.
  computeBundleHash(files, manifest) {
    var hash = crypto.createHash('sha1');
    files.forEach((file) => hash.update(manifest[file] + ':' + file));
    return hash.digest('hex');
  }

  // Generate the string contents of the manifest.
  generateManifest(manifest) {
    var files = Object.keys(manifest).sort();
    var bundleHash = this.computeBundleHash(files, manifest);
    var contents = files
      .map((file) => `# sw.file.hash: ${this.computeFileHash(file)}\n/${file}`)
      .join('\n');
    return `CACHE MANIFEST
# sw.bundle: ng-cli
# sw.version: ${bundleHash}
${contents}
`;
  }

  // Read the manifest from the cache and split it out into a dict of files to hashes.
  readManifestFromCache() {
    var contents = fs.readFileSync(path.join(this.cachePath, MANIFEST_FILE), FILE_ENCODING);
    var manifest = {};
    var hash = null;
    contents
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== 'CACHE MANIFEST')
      .filter((line) => line !== '')
      .filter((line) => !line.startsWith('#') || line.startsWith('# sw.'))
      .forEach((line) => {
        if (line.startsWith(FILE_HASH_PREFIX)) {
          // This is a hash prefix for the next file in the list.
          hash = line.substring(FILE_HASH_PREFIX.length).trim();
        } else if (line.startsWith('/')) {
          // This is a file belonging to the application.
          manifest[line.substring(1)] = hash;
          hash = null;
        }
      });
    return manifest;
  }
}

Object.defineProperty(exports, "__esModule", { value: true });
exports.default = diffingPlugin.wrapDiffingPlugin(DiffingSWManifest);