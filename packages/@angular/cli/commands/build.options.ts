export const CommandOptions: any = [
  {
    name: 'target',
    type: String,
    default: 'development',
    aliases: ['t', { 'dev': 'development' }, { 'prod': 'production' }]
  },
  { name: 'environment', type: String, aliases: ['e'] },
  { name: 'output-path', type: 'Path', aliases: ['op'] },
  { name: 'aot', type: Boolean },
  { name: 'sourcemap', type: Boolean, aliases: ['sm', 'sourcemaps'] },
  { name: 'vendor-chunk', type: Boolean, default: true, aliases: ['vc'] },
  { name: 'base-href', type: String, aliases: ['bh'] },
  { name: 'deploy-url', type: String, aliases: ['d'] },
  { name: 'verbose', type: Boolean, default: false, aliases: ['v'] },
  { name: 'progress', type: Boolean, default: true, aliases: ['pr'] },
  { name: 'i18n-file', type: String },
  { name: 'i18n-format', type: String },
  { name: 'locale', type: String },
  { name: 'extract-css', type: Boolean, aliases: ['ec'] },
  {
    name: 'output-hashing',
    type: String,
    values: ['none', 'all', 'media', 'bundles'],
    description: 'define the output filename cache-busting hashing mode',
    aliases: ['oh']
  },
];

export const availableOptions = CommandOptions.concat([
  { name: 'watch', type: Boolean, default: false, aliases: ['w'] }
]);
