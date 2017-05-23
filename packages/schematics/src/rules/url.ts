import {SchematicContext, Source} from '../engine/interface';

import {parse} from 'url';


export function url(urlString: string): Source {
  const url = parse(urlString);
  return (context: SchematicContext) => context.engine.createSourceFromUrl(url)(context);
}
