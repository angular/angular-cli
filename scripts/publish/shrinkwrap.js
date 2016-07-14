#!/usr/bin/env node
'use strict';


function removeResolvedKeys(json) {
  if (json['resolved']) {
    delete json['resolved'];
  }
  if (json['_resolved']) {
    delete json['_resolved'];
  }

  const deps = json['dependencies'] || {};
  for (const key of Object.keys(deps)) {
    deps[key] = removeResolvedKeys(deps[key]);
  }

  return json;
}


const fs = require('fs');
const path = require('path');

const shrinkwrapPath = path.join(__dirname, '../../npm-shrinkwrap.json');
const shrinkwrap = JSON.parse(fs.readFileSync(shrinkwrapPath, 'utf-8'));

const newJson = removeResolvedKeys(shrinkwrap);
fs.writeFileSync(shrinkwrapPath, JSON.stringify(newJson, null, 2), 'utf-8');
