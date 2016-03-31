'use strict';

const Plugin = require('broccoli-caching-writer');
var path = require('path');
var fs = require('fs');
var crypto = require('crypto');

var FILE_ENCODING = { encoding: 'utf-8' };
var MANIFEST_FILE = 'manifest.appcache';
var FILE_HASH_PREFIX = '# sw.file.hash:';

class DiffingSWManifest extends Plugin {
  constructor(inputPath, options) {
    super(inputPath, options);

    this.options = options;
    this.firstBuild = true;
    this.manifest = {};
  }

  build() {
    var manifest = this.manifest;

    const files = this.listFiles();
    // Removed files from the manifest that aren't part of the files.
    Object.keys(manifest)
      .filter((f) => files.indexOf(f) == -1)
      .forEach((file) => delete manifest[file]);

    // Merge the lists of added and changed paths and update their hashes in the manifest.
    files
      .filter((file) => file !== MANIFEST_FILE)
      .forEach((file) => manifest[file] = this.computeFileHash(file));

    var manifestPath = path.join(this.outputPath, MANIFEST_FILE);
    fs.writeFileSync(manifestPath, this.generateManifest(manifest));
  }

  // Compute the hash of the given relative file.
  computeFileHash(file) {
    var contents = fs.readFileSync(file);
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
      .map((file) => {
        return `# sw.file.hash: ${this.computeFileHash(file)}\n`
             + `${path.sep}${path.relative(this.inputPaths[0], file)}`;
      })
      .join('\n');
    return 'CACHE MANIFEST\n'
         + '# sw.bundle: ng-cli\n'
         + `# sw.version: ${bundleHash}\n`
         + `${contents}\n`;
  }

  // Read the manifest from the cache and split it out into a dict of files to hashes.
  readManifestFromCache() {
    var contents = fs.readFileSync(path.join(this.outputPath, MANIFEST_FILE), FILE_ENCODING);
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

Object.defineProperty(exports, '__esModule', { value: true });
exports.default = DiffingSWManifest;
