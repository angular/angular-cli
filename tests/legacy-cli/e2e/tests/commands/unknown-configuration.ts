import { ng } from "../../utils/process";

export default async function () {
  try {
    await ng('build', '--configuration', 'invalid');
    throw new Error('should have failed.');
  } catch (error) {
    if (!error.message.includes(`Configuration 'invalid' is not set in the workspace`)) {
      throw error;
    }
  }
};
