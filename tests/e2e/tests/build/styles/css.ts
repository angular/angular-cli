import {writeMultipleFiles, expectFileToMatch} from '../../../utils/fs';
import {ng} from '../../../utils/process';


export default function() {
  return writeMultipleFiles({
    'src/styles.css': `
      @import './imported-styles.css';
      
      body { background-color: blue; }
    `,
    'src/imported-styles.css': `
      p { background-color: red; }
    `
  })
    .then(() => ng('build'))
    .then(() => expectFileToMatch('dist/styles.bundle.js', 'body { background-color: blue; }'))
    .then(() => expectFileToMatch('dist/styles.bundle.js', 'p { background-color: red; }'));
}
