import { NgModule }       from '@angular/core';
import { FormsModule }    from '@angular/forms';
import { CommonModule }   from '@angular/common';

import { CrisisService }        from './crisis.service';
import { CrisisDetailResolve }  from './crisis-detail-resolve.service';

import { CrisisCenterComponent } from './crisis-center.component';
import { CrisisListComponent }   from './crisis-list.component';
import { CrisisDetailComponent } from './crisis-detail.component';
import { CrisisAdminComponent }  from './crisis-admin.component';

import { crisisCenterRouting } from './crisis-center.routing';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    crisisCenterRouting
  ],
  declarations: [
    CrisisCenterComponent,
    CrisisListComponent,
    CrisisDetailComponent,
    CrisisAdminComponent
  ],

  providers: [
    CrisisService,
    CrisisDetailResolve
  ]
})
export class CrisisCenterModule {}


