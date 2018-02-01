// Strip BOM from file data.
// https://stackoverflow.com/questions/24356713
export function stripBom(data: string) {
  return data.replace(/^\uFEFF/, '');
}
