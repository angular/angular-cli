export const availableOptions: any = [
  { name: 'watch', type: Boolean, default: true, aliases: ['w'] },
  { name: 'code-coverage', type: Boolean, default: false, aliases: ['cc'] },
  { name: 'single-run', type: Boolean, default: false, aliases: ['sr'] },
  { name: 'progress', type: Boolean, default: true },
  { name: 'browsers', type: String },
  { name: 'colors', type: Boolean },
  { name: 'log-level', type: String },
  { name: 'port', type: Number },
  { name: 'reporters', type: String },
  { name: 'build', type: Boolean, default: true },
  { name: 'sourcemap', type: Boolean, default: true, aliases: ['sm'] }
];
