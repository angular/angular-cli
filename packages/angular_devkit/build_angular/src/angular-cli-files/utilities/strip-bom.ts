// tslint:disable
// TODO: cleanup this file, it's copied as is from Angular CLI.

// Strip BOM from file data.
// https://stackoverflow.com/questions/24356713
export function stripBom(data: string) {
  return data.replace(/^\uFEFF/, '');
}
