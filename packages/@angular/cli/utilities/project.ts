import { findUp } from './find-up';

export function insideProject(): boolean {
  const possibleConfigFiles = ['angular.json', '.angular.json'];

  return findUp(possibleConfigFiles, process.cwd()) !== null;
}
