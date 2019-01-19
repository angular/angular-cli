import { execAndWaitForOutputToMatch, ng } from '../../utils/process';
import { expectToFail } from '../../utils/utils';

export default async function() {
  await expectToFail(() => ng('build', '--notanoption'));

  await execAndWaitForOutputToMatch(
    'ng',
    [ 'build', '--notanoption' ],
    /Unknown option: '--notanoption'/,
  );

  await expectToFail(() => execAndWaitForOutputToMatch(
    'ng',
    [ 'build', '--notanoption' ],
    /should NOT have additional properties\(notanoption\)./,
  ));

  const ngGenerateArgs = [ 'generate', 'component', 'component-name', '--notanoption' ];
  await expectToFail(() => ng(...ngGenerateArgs));

  await execAndWaitForOutputToMatch(
    'ng',
    ngGenerateArgs,
    /Unknown option: '--notanoption'/,
  );
}
