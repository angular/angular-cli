import { availableOptions as importedOptions } from './serve.options';

export const availableOptions = importedOptions.concat([
  { name: 'config', type: String, aliases: ['c'] },
  { name: 'specs', type: Array, default: [], aliases: ['sp'] },
  { name: 'element-explorer', type: Boolean, default: false, aliases: ['ee'] },
  { name: 'webdriver-update', type: Boolean, default: true, aliases: ['wu'] },
  { name: 'serve', type: Boolean, default: true, aliases: ['s'] }
]);
