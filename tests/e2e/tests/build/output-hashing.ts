import {stripIndents} from 'common-tags';
import * as fs from 'fs';
import {ng} from '../../utils/process';
import { writeMultipleFiles, expectFileToMatch } from '../../utils/fs';

function verifyMedia(css: RegExp, content: RegExp) {
  return new Promise((resolve, reject) => {
    const [fileName] = fs.readdirSync('./dist').filter(name => name.match(css));
    if (!fileName) {
      reject(new Error(`File ${fileName} was expected to exist but not found...`));
    }
    resolve(fileName);
  })
  .then(fileName => expectFileToMatch(`dist/${fileName}`, content));
}

export default function() {
  return Promise.resolve()
    .then(() => writeMultipleFiles({
    'src/styles.css': stripIndents`
      body { background-image: url("image.svg"); }
    `,
    'src/image.svg': 'I would like to be an image someday.'
    }))
    .then(() => ng('build', '--dev', '--output-hashing=all'))
    .then(() => expectFileToMatch('dist/index.html', /inline\.[0-9a-f]{20}\.bundle\.js/))
    .then(() => expectFileToMatch('dist/index.html', /main\.[0-9a-f]{20}\.bundle\.js/))
    .then(() => expectFileToMatch('dist/index.html', /styles\.[0-9a-f]{20}\.bundle\.(css|js)/))
    .then(() => verifyMedia(/styles\.[0-9a-f]{20}\.bundle\.(css|js)/, /image\.[0-9a-f]{20}\.svg/))

    .then(() => ng('build', '--prod', '--output-hashing=none'))
    .then(() => expectFileToMatch('dist/index.html', /inline\.bundle\.js/))
    .then(() => expectFileToMatch('dist/index.html', /main\.bundle\.js/))
    .then(() => expectFileToMatch('dist/index.html', /styles\.bundle\.(css|js)/))
    .then(() => verifyMedia(/styles\.bundle\.(css|js)/, /image\.svg/))

    .then(() => ng('build', '--dev', '--output-hashing=media'))
    .then(() => expectFileToMatch('dist/index.html', /inline\.bundle\.js/))
    .then(() => expectFileToMatch('dist/index.html', /main\.bundle\.js/))
    .then(() => expectFileToMatch('dist/index.html', /styles\.bundle\.(css|js)/))
    .then(() => verifyMedia(/styles\.bundle\.(css|js)/, /image\.[0-9a-f]{20}\.svg/))

    .then(() => ng('build', '--dev', '--output-hashing=bundles'))
    .then(() => expectFileToMatch('dist/index.html', /inline\.[0-9a-f]{20}\.bundle\.js/))
    .then(() => expectFileToMatch('dist/index.html', /main\.[0-9a-f]{20}\.bundle\.js/))
    .then(() => expectFileToMatch('dist/index.html', /styles\.[0-9a-f]{20}\.bundle\.(css|js)/))
    .then(() => verifyMedia(/styles\.[0-9a-f]{20}\.bundle\.(css|js)/, /image\.svg/));
}
