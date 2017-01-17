import { writeMultipleFiles, expectFileToMatch } from '../../../utils/fs';
import { ng } from '../../../utils/process';
import { stripIndents } from 'common-tags';

export default function () {
    return writeMultipleFiles({
    'src/styles.css': stripIndents`
      div { background: url("./assets/more.svg"); }
    `,
    'src/assets/more.svg': stripIndents`
      <svg width="100" height="100">
        <circle cx="50" cy="50" r="40" stroke="green" stroke-width="4" fill="yellow" />
      </svg>
    `})
    .then(() => ng('build', '--extract-css'))
    .then(() => expectFileToMatch('dist/styles.bundle.css',
      /div\s*{\s*background:\s*url\(more.svg\);\s*}/))
    .then(() => ng('build', '--extract-css', '--deploy-url=client/'))
    .then(() => expectFileToMatch('dist/styles.bundle.css',
      /div\s*{\s*background:\s*url\(more.svg\);\s*}/));
}
