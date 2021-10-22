import { createProjectFromAsset } from '../../utils/assets';
import { ng } from '../../utils/process';
import { expectToFail } from '../../utils/utils';

export default async function () {
  await createProjectFromAsset('7.0-project');

  const extraArgs = ['--force'];
  const { message } = await expectToFail(() =>
    ng('update', '@angular/core', ...extraArgs),
  );
  if (
    !message.includes(`Updating multiple major versions of '@angular/core' at once is not supported`)
  ) {
    console.error(message);
    throw new Error(
      `Expected error message to include "Updating multiple major versions of '@angular/core' at once is not supported" but didn't.`,
    );
  }
}
