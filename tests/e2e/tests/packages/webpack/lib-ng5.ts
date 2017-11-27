import {stripIndents} from 'common-tags';
import {createProjectFromAsset} from '../../../utils/assets';
import {node} from '../../../utils/process';
import {expectFileToMatch, writeFile, readFile} from '../../../utils/fs';


export default function(skipCleaning: () => void) {
  return Promise.resolve()
    .then(() => createProjectFromAsset('webpack/test-lib-ng5'))
    .then(() => writeFile('run.js', `
    require('@ngtools/webpack')
      .compile('webpack.config.js', 'tsconfig.json')
      .then( () => process.exit() )
      .catch( err => {
        process.exit(99);
        console.error(err);
      });
    `))
    .then(() => node('run.js'))
    .then(() => expectFileToMatch('lib/lib-component/lib-component.component.js',
      `template: "<h1>Hello World</h1>"`))
    .then(() => expectFileToMatch('lib/lib-component/lib-component.component.js',
      `styles: ["h1 {\\n  border: 15px black solid; }\\n"]`) )
    .then(() => readFile('lib/my-lib.metadata.json'))
    .then( data => JSON.parse(data) )
    .then( metaBundle => {
      const srcMeta: any = metaBundle.metadata.LibComponentComponent.decorators[0].arguments[0];
      const matchMeta: any = {
        selector: 'lib-component',
        template: '<h1>Hello World</h1>',
        styles: [ 'h1 {\n  border: 15px black solid; }\n' ]
      };
      ['selector', 'template'].forEach( k => {
        if (matchMeta[k] !== srcMeta[k]) {
          throw new Error(stripIndents`File "my-lib.metadata.json" did not match expected format...
            Field ${k} should be "${matchMeta[k]}" but found "${srcMeta[k]}"
            ------
          `);
        }
      });

      if (matchMeta.styles[0] !== srcMeta.styles[0]) {
        throw new Error(stripIndents`File "my-lib.metadata.json" did not match expected format...
            Field styles[0] should be "${matchMeta.styles[0]}" but found "${srcMeta.styles[0]}"
            ------
          `);
      }
     })
    .then(() => skipCleaning() );
}
