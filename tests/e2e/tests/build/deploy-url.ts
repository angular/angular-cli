import { ng } from '../../utils/process';
import { expectFileToMatch, writeMultipleFiles } from '../../utils/fs';
import { updateJsonFile } from '../../utils/project';
import { getGlobalVariable } from '../../utils/env';
import { stripIndents } from 'common-tags';


export default function () {
  // Skip this in Appveyor tests.
  if (getGlobalVariable('argv').appveyor) {
    return Promise.resolve();
  }


  return Promise.resolve()
    .then(() => writeMultipleFiles({
      'src/styles.css': 'div { background: url("./assets/more.svg"); }',
      'src/assets/more.svg': stripIndents`
        <svg width="100" height="100">
          <circle cx="50" cy="50" r="40" stroke="green" stroke-width="4" fill="yellow" />
        </svg>
    `}))
    .then(() => ng('build', '--deploy-url=deployUrl/', '--extract-css'))
    .then(() => expectFileToMatch('dist/index.html', 'deployUrl/main.bundle.js'))
    // verify --deploy-url isn't applied to extracted css urls
    .then(() => expectFileToMatch('dist/styles.bundle.css', /url\(more\.[0-9a-f]{20}\.svg\)/))
    // verify option also works in config
    .then(() => updateJsonFile('.angular-cli.json', configJson => {
      const app = configJson['apps'][0];
      app['deployUrl'] = 'config-deployUrl/';
    }))
    .then(() => ng('build'))
    .then(() => expectFileToMatch('dist/index.html', 'config-deployUrl/main.bundle.js'))
    // verify --deploy-url is applied to non-extracted css urls
    .then(() => ng('build', '--deploy-url=deployUrl/', '--extract-css=false'))
    .then(() => expectFileToMatch('dist/styles.bundle.js',
      /__webpack_require__.p \+ \"more\.[0-9a-f]{20}\.svg\"/));
}
