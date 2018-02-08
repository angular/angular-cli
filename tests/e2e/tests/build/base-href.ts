import { ng } from '../../utils/process';
import { expectFileToMatch, replaceInFile } from '../../utils/fs';
import { updateJsonFile } from '../../utils/project';


export default function() {
  return ng('build', '--base-href', '/myUrl')
    .then(() => expectFileToMatch('dist/index.html', /<base href="\/myUrl">/))
    .then(() => updateJsonFile('.angular-cli.json', configJson => {
      const app = configJson['apps'][0];
      app['baseHref'] = '/myUrl';
    }))
    .then(() => ng('build'))
    .then(() => expectFileToMatch('dist/index.html', /<base href="\/myUrl">/))
    .then(() => replaceInFile('src/index.html', 'href="/"', 'href=""'))
    .then(() => ng('build'))
    .then(() => expectFileToMatch('dist/index.html', /<base href="\/myUrl">/));
}
