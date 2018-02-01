import {ng} from '../../utils/process';
import { copyProjectAsset } from '../../utils/assets';
import { writeMultipleFiles, expectFileToMatch, expectFileMatchToExist } from '../../utils/fs';


function verifyMedia(css: RegExp, content: RegExp) {
  return expectFileMatchToExist('./dist', css)
    .then(fileName => expectFileToMatch(`dist/${fileName}`, content));
}

export default function() {
  return Promise.resolve()
    .then(() => writeMultipleFiles({
      'src/styles.css': 'body { background-image: url("./assets/image.png"); }'
    }))
    // use image with file size >10KB to prevent inlining
    .then(() => copyProjectAsset('images/spectrum.png', './assets/image.png'))
    .then(() => ng('build', '--dev', '--output-hashing=all'))
    .then(() => expectFileToMatch('dist/index.html', /inline\.[0-9a-f]{20}\.bundle\.js/))
    .then(() => expectFileToMatch('dist/index.html', /main\.[0-9a-f]{20}\.bundle\.js/))
    .then(() => expectFileToMatch('dist/index.html', /styles\.[0-9a-f]{20}\.bundle\.(css|js)/))
    .then(() => verifyMedia(/styles\.[0-9a-f]{20}\.bundle\.(css|js)/, /image\.[0-9a-f]{20}\.png/))

    .then(() => ng('build', '--prod', '--output-hashing=none'))
    .then(() => expectFileToMatch('dist/index.html', /inline\.bundle\.js/))
    .then(() => expectFileToMatch('dist/index.html', /main\.bundle\.js/))
    .then(() => expectFileToMatch('dist/index.html', /styles\.bundle\.(css|js)/))
    .then(() => verifyMedia(/styles\.bundle\.(css|js)/, /image\.png/))

    .then(() => ng('build', '--dev', '--output-hashing=media'))
    .then(() => expectFileToMatch('dist/index.html', /inline\.bundle\.js/))
    .then(() => expectFileToMatch('dist/index.html', /main\.bundle\.js/))
    .then(() => expectFileToMatch('dist/index.html', /styles\.bundle\.(css|js)/))
    .then(() => verifyMedia(/styles\.bundle\.(css|js)/, /image\.[0-9a-f]{20}\.png/))

    .then(() => ng('build', '--dev', '--output-hashing=bundles'))
    .then(() => expectFileToMatch('dist/index.html', /inline\.[0-9a-f]{20}\.bundle\.js/))
    .then(() => expectFileToMatch('dist/index.html', /main\.[0-9a-f]{20}\.bundle\.js/))
    .then(() => expectFileToMatch('dist/index.html', /styles\.[0-9a-f]{20}\.bundle\.(css|js)/))
    .then(() => verifyMedia(/styles\.[0-9a-f]{20}\.bundle\.(css|js)/, /image\.png/));
}
