export const availableOptions: any = [
  {
    name: 'i18n-format',
    type: String,
    default: 'xlf',
    aliases: ['f', {'xmb': 'xmb'}, {'xlf': 'xlf'}, {'xliff': 'xlf'}]
  },
  { name: 'output-path',  type: 'Path', default: null, aliases: ['op']},
  { name: 'verbose',      type: Boolean, default: false},
  { name: 'progress',     type: Boolean, default: true }
];
