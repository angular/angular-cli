import {writeMultipleFiles, expectFileToMatch} from '../../../utils/fs';
import {ng} from '../../../utils/process';


export default function() {
  return writeMultipleFiles({
    'src/styles.css': `
      @import './imported-styles.css';
      
      body { background-color: blue; }

      div { flex: 1 }
    `,
    'src/imported-styles.css': `
      p { background-color: red; }
    `
  })
    .then(() => ng('build'))
    .then(() => expectFileToMatch('dist/styles.bundle.js', 'body { background-color: blue; }'))
    .then(() => expectFileToMatch('dist/styles.bundle.js', 'p { background-color: red; }'))
    .then(() => expectFileToMatch(
      'dist/styles.bundle.js',
      'div { -webkit-box-flex: 1; -ms-flex: 1; flex: 1 }'));
}
