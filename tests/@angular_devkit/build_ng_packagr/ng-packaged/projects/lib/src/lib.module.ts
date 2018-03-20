import { NgModule } from '@angular/core';
import { LibComponent } from './lib.component';
import { LibService } from './lib.service';

@NgModule({
  imports: [
  ],
  declarations: [LibComponent],
  providers: [LibService]
})
export class LibModule { }
