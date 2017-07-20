import * as fs from 'fs';
import {SchemaClassFactory} from '@ngtools/json-schema';
import {Logger} from '@ngtools/logger';


export function buildSchema(inFile: string, _logger: Logger): string {
  const jsonSchema = JSON.parse(fs.readFileSync(inFile, 'utf-8'));
  const SchemaClass = SchemaClassFactory(jsonSchema);
  const schemaInstance = new SchemaClass({});

  return schemaInstance.$$serialize('text/x.dts', 'CliConfig');
}


export function build(args: string[], _opts: any, logger: Logger): void {
  const inFile = args[1] as string;
  const outFile = args[2] as string;
  if (!inFile) {
    logger.fatal('Command build-schema needs an input file.');
    return;
  }

  const output = require('./build-schema').buildSchema(inFile, logger);
  if (outFile) {
    fs.writeFileSync(outFile, output, { encoding: 'utf-8' });
  } else {
    logger.info(output);
  }
}
