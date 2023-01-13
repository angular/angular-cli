import { ng } from '../../utils/process';

export default async function () {
  const schematicNameVariation = [
    'component',
    'c',
    '@schematics/angular:component',
    '@schematics/angular:c',
  ];

  for (const schematic of schematicNameVariation) {
    await ng('generate', schematic, 'comp-name', '--display-block', '--dry-run');
  }
}
