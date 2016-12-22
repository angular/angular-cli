export function packageChunkSort(packages: string[]) {
  return function sort(left: any, right: any) {
    let leftIndex = packages.indexOf(left.names[0]);
    let rightindex = packages.indexOf(right.names[0]);

    if ( leftIndex < 0 || rightindex < 0) {
      // Unknown packages are loaded last
      return 1;
    }

    if (leftIndex > rightindex) {
      return 1;
    }

    return -1;
  };
}
