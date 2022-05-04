import { writeMultipleFiles } from '../../utils/fs';
import { ng } from '../../utils/process';
import { expectToFail } from '../../utils/utils';

export default async function () {
  await writeMultipleFiles({
    'src/app/app.component.spec.ts': `
        describe('AppComponent', () => {
          it('failing test', () => {
            expect('1').toEqual('2');
          });
        });
      `,
  });

  const { message } = await expectToFail(() => ng('test', '--no-watch'));
  if (message.includes('_karma_webpack_')) {
    throw new Error(`Didn't expect logs to server address and webpack scheme.\n${message}`);
  }

  if (!message.includes('(src/app/app.component.spec.ts:4:25)')) {
    throw new Error(
      `Expected logs to contain relative path to (src/app/app.component.spec.ts:4:25)\n${message}`,
    );
  }
}
