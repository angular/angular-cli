import {ng} from '../../utils/process';
import {expectFileToMatch} from '../../utils/fs';


export default function() {
  return ng('build', '--base-href', '/myUrl')
  .then(() => {
    const fs = require('fs');
    console.log(fs.readdirSync('./'));
    console.log('--===--');
    console.log(fs.readdirSync('dist/'));
  })
    .then(() => expectFileToMatch('dist/index.html', /<base href="\/myUrl">/));
}
