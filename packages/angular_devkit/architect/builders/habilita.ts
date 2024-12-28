import { createBuilder, BuilderContext, BuilderOutput } from '@angular-devkit/architect';
import { Observable, of } from 'rxjs';

interface HabilitaSchema {
  message: string;
}

export default createBuilder<HabilitaSchema>((options, context) => {
  return new Observable<BuilderOutput>((observer) => {
    context.logger.info(`Habilita builder says: ${options.message}`);
    observer.next({ success: true });
    observer.complete();
  });
});
