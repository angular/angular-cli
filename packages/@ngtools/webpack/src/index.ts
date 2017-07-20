// @ignoreDep @angular/compiler-cli
import * as path from 'path';

let version;

// Check that Angular is available.
try {
  version = require('@angular/compiler-cli').VERSION;
} catch (e) {
  throw new Error('The "@angular/compiler-cli" package was not properly installed. Error: ' + e);
}

// Check that Angular is also not part of this module's node_modules (it should be the project's).
const compilerCliPath = require.resolve('@angular/compiler-cli');
if (compilerCliPath.startsWith(path.dirname(__dirname))) {
  throw new Error('The @ngtools/webpack plugin now relies on the project @angular/compiler-cli. '
                + 'Please clean your node_modules and reinstall.');
}

// Throw if we're neither 2.3.1 or more, nor 4.x.y, nor 5.x.y.
if (!(   version.major == '5'
      || version.major == '4'
      || (version.major == '2'
          && (   version.minor == '4'
              || version.minor == '3' && version.patch == '1')))) {
  throw new Error('Version of @angular/compiler-cli needs to be 2.3.1 or greater. '
                + `Current version is "${version.full}".`);
}

export * from './plugin';
export * from './extract_i18n_plugin';
export {ngcLoader as default} from './loader';
export {PathsPlugin} from './paths-plugin';
