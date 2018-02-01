#!/usr/bin/env node
'use strict';


function removeResolvedKeys(json) {
  if (json['resolved']) {
    delete json['resolved'];
  }
  if (json['_resolved']) {
    delete json['_resolved'];
  }
  if (json['from']) {
    delete json['from'];
  }
  if (json['_from']) {
    delete json['_from'];
  }

  const deps = json['dependencies'] || {};
  for (const key of Object.keys(deps)) {
    if (key.startsWith('@angular/')) {
      delete deps[key];
    } else if (key.startsWith('@ngtools/')) {
      delete deps[key];
    } else if (key.startsWith('@angular-cli/')) {
      delete deps[key];
    } else {
      deps[key] = removeResolvedKeys(deps[key]);
    }
  }

  return json;
}


const fs = require('fs');
const path = require('path');

const shrinkwrapPath = path.join(process.cwd(), 'npm-shrinkwrap.json');
const shrinkwrap = JSON.parse(fs.readFileSync(shrinkwrapPath, 'utf-8'));

const newJson = removeResolvedKeys(shrinkwrap);
fs.writeFileSync(shrinkwrapPath, JSON.stringify(newJson, null, 2), 'utf-8');
