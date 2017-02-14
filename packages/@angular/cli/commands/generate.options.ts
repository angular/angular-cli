import * as fs from 'fs';
import * as path from 'path';

const Blueprint = require('../ember-cli/lib/models/blueprint');

const blueprintList = fs.readdirSync(path.join(__dirname, '..', 'blueprints'));

export const blueprints = blueprintList
  .filter(bp => bp.indexOf('-test') === -1)
  .filter(bp => bp !== 'ng2')
  .map(bp => Blueprint.load(path.join(__dirname, '..', 'blueprints', bp)));
