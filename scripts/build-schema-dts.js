#!/usr/bin/env node
'use strict';

const fs = require('fs');
const minimist = require('minimist');

// Load the bootstrap.
require('../lib/bootstrap-local');
const SchemaClassFactory = require('@ngtools/json-schema').SchemaClassFactory;

const argv = minimist(process.argv.slice(2));
const inFile = argv._[0];
const outFile = argv._[1];

if (!inFile) {
  process.stderr.write('Need to pass in an input file.\n');
  process.exit(1);
}
const jsonSchema = JSON.parse(fs.readFileSync(inFile, 'utf-8'));
const SchemaClass = SchemaClassFactory(jsonSchema);
const schemaInstance = new SchemaClass();
const serialized = schemaInstance.$$serialize('text/x.dts', 'CliConfig');

if (outFile) {
  fs.writeFileSync(outFile, serialized, 'utf-8');
} else {
  process.stdout.write(serialized);
}
