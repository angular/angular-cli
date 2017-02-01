export const availableOptions: any = [
  { name: 'dry-run', type: Boolean, default: false, aliases: ['d'] },
  { name: 'verbose', type: Boolean, default: false, aliases: ['v'] },
  { name: 'link-cli', type: Boolean, default: false, aliases: ['lc'] },
  { name: 'skip-npm', type: Boolean, default: false, aliases: ['sn'] },
  { name: 'skip-git', type: Boolean, default: false, aliases: ['sg'] },
  { name: 'skip-tests', type: Boolean, default: false, aliases: ['st'] },
  { name: 'skip-commit', type: Boolean, default: false, aliases: ['sc'] },
  { name: 'name', type: String, default: '', aliases: ['n'] },
  { name: 'source-dir', type: String, default: 'src', aliases: ['sd'] },
  { name: 'style', type: String, default: 'css' },
  { name: 'prefix', type: String, default: 'app', aliases: ['p'] },
  { name: 'routing', type: Boolean, default: false },
  { name: 'inline-style', type: Boolean, default: false, aliases: ['is'] },
  { name: 'inline-template', type: Boolean, default: false, aliases: ['it'] }
];
