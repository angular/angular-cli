#!/usr/bin/env node
'use strict';

const fs = require('fs');


const filePath = 'node_modules/@types/common-tags/common-tags.d.ts';
const content = fs.readFileSync(filePath, 'utf8')
  .replace(/literals: string\[\]/, 'literals: TemplateStringsArray');
fs.writeFileSync(filePath, content, 'utf8');
