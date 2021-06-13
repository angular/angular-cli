import { npm } from '../../utils/process';


export default async function() {
  try {
    await npm('audit');
  } catch {}
}
