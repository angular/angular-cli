import { normalize } from 'path';
import { createProjectFromAsset } from '../../../utils/assets';
import { exec } from '../../../utils/process';
import { expectFileToMatch } from '../../../utils/fs';


export default function (skipCleaning: () => void) {
  // This test was broken as it was a copy of the ng2 server test
  // and did not actually test ng5
  return;

  return Promise.resolve()
    .then(() => createProjectFromAsset('webpack/test-server-app'))
    .then(() => exec(normalize('node_modules/.bin/webpack-cli')))
    .then(() => expectFileToMatch('dist/app.main.js',
      new RegExp('MyInjectable.ctorParameters = .*'
      + 'type: undefined, decorators.*Inject.*args: .*DOCUMENT.*')))
    .then(() => expectFileToMatch('dist/app.main.js',
      new RegExp('AppComponent.ctorParameters = .*MyInjectable')))
    .then(() => expectFileToMatch('dist/app.main.js',
      /AppModule \*\/\].*\.testProp = \'testing\'/))
    .then(() => expectFileToMatch('dist/app.main.js',
      /platformServer \*\/\]\)\(\)\.bootstrapModuleFactory\(.*\/\* AppModuleNgFactory \*\/\]/))
    .then(() => expectFileToMatch('dist/app.main.js',
      /renderModuleFactory \*\/\].*\/\* AppModuleNgFactory \*\/\]/))
    .then(() => skipCleaning());
}
