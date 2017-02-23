import {JsonSchemaErrorBase} from './error';
import {Serializer, WriterFn} from './serializer';
import {JsonSerializer} from './serializers/json';
import {DTsSerializer} from './serializers/dts';


export class UnknownMimetype extends JsonSchemaErrorBase {}


export function createSerializerFromMimetype(mimetype: string,
                                             writer: WriterFn,
                                             ...opts: any[]): Serializer {
  let Klass: { new (writer: WriterFn, ...args: any[]): Serializer } = null;
  switch (mimetype) {
    case 'application/json': Klass = JsonSerializer; break;
    case 'text/json': Klass = JsonSerializer; break;
    case 'text/x.typescript': Klass = DTsSerializer; break;
    case 'text/x.dts': Klass = DTsSerializer; break;

    default: throw new UnknownMimetype();
  }

  return new Klass(writer, ...opts);

}


declare module './serializer' {
  namespace Serializer {
    export let fromMimetype: typeof createSerializerFromMimetype;
  }
}

Serializer.fromMimetype = createSerializerFromMimetype;
