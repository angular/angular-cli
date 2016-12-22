import { ng } from '../../utils/process';

export default function () {
  // make sure both --watch=false and --single-run work
  return ng('test', '--single-run')
    .then(() => ng('test', '--watch=false'));
}
