import {normalize} from 'path';
import {createProjectFromAsset} from '../../../utils/assets';
import {exec} from '../../../utils/process';
import {expectFileToMatch} from '../../../utils/fs';


export default function(skipCleaning: () => void) {
  return Promise.resolve()
    .then(() => createProjectFromAsset('webpack/test-server-app'))
    .then(() => exec(normalize('node_modules/.bin/webpack')))
    .then(() => expectFileToMatch('dist/app.main.js',
      new RegExp('.bootstrapModuleFactory'))
    .then(() => expectFileToMatch('dist/app.main.js',
      new RegExp('MyInjectable.ctorParameters = .*'
               + 'type: .*ViewContainerRef.*'
               + 'type: undefined, decorators.*Inject.*args: .*DOCUMENT.*'))
    .then(() => expectFileToMatch('dist/app.main.js',
      new RegExp('AppComponent.ctorParameters = .*MyInjectable'))
    .then(() => expectFileToMatch('dist/app.main.js',
      /AppModule \*\/\].*\.testProp = \'testing\'/))
    .then(() => expectFileToMatch('dist/app.main.js',
      /renderModuleFactory \*\/\].*\/\* AppModuleNgFactory \*\/\]/))
    .then(() => skipCleaning());
}
