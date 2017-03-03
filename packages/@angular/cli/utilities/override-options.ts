const cloneDeep = require('lodash/cloneDeep');

export function overrideOptions(original: any[], overrides: any[]) {
  let copy = cloneDeep(original);
  overrides.forEach(override => {
    const option = copy.find((opt: any) => opt.name == override.name);
    if (option) {
      Object.assign(option, override);
    }
  });
  return copy;
}
