import { writeMultipleFiles } from '../../utils/fs';
import { ng, npm } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';

export default function () {
  return updateJsonFile('package.json', packageJson => {
    // Install ngrx
    packageJson['dependencies']['@ngrx/effects'] = '^6.1.0';
    packageJson['dependencies']['@ngrx/schematics'] = '^6.1.0';
    packageJson['dependencies']['@ngrx/store'] = '^6.1.0';
    packageJson['dependencies']['@ngrx/store-devtools'] = '^6.1.0';
  })
    .then(() => npm('install'))
    // Create an app that uses ngrx decorators and has e2e tests.
    .then(_ => writeMultipleFiles({
      './e2e/src/app.po.ts': `
        import { browser, by, element } from 'protractor';
        export class AppPage {
          navigateTo() {    return browser.get('/');  }
          getIncrementButton() { return element(by.buttonText('Increment')); }
          getDecrementButton() { return element(by.buttonText('Decrement')); }
          getResetButton() { return element(by.buttonText('Reset Counter')); }
          getCounter() { return element(by.xpath('/html/body/app-root/div/span')).getText(); }
        }
      `,
      './e2e/src/app.e2e-spec.ts': `
        import { AppPage } from './app.po';

        describe('workspace-project App', () => {
          let page: AppPage;

          beforeEach(() => {
            page = new AppPage();
          });

          it('should operate counter', () => {
            page.navigateTo();
            page.getIncrementButton().click();
            page.getIncrementButton().click();
            expect(page.getCounter()).toEqual('2');
            page.getDecrementButton().click();
            expect(page.getCounter()).toEqual('1');
            page.getResetButton().click();
            expect(page.getCounter()).toEqual('0');
          });
        });
      `,
      './src/app/app.component.ts': `
        import { Component } from '@angular/core';
        import { Store, select } from '@ngrx/store';
        import { Observable } from 'rxjs';
        import { INCREMENT, DECREMENT, RESET } from './counter.reducer';

        interface AppState {
          count: number;
        }

        @Component({
          selector: 'app-root',
          template: \`
            <button (click)="increment()">Increment</button>
            <div>Current Count: <span>{{ count$ | async }}</span></div>
            <button (click)="decrement()">Decrement</button>

            <button (click)="reset()">Reset Counter</button>
          \`,
        })
        export class AppComponent {
          count$: Observable<number>;

          constructor(private store: Store<AppState>) {
            this.count$ = store.pipe(select(state => state.count));
          }

          increment() {
            this.store.dispatch({ type: INCREMENT });
          }

          decrement() {
            this.store.dispatch({ type: DECREMENT });
          }

          reset() {
            this.store.dispatch({ type: RESET });
          }
        }
      `,
      './src/app/app.effects.ts': `
        import { Injectable } from '@angular/core';
        import { Actions, Effect } from '@ngrx/effects';
        import { filter, map, tap } from 'rxjs/operators';

        @Injectable()
        export class AppEffects {

          @Effect()
          mapper$ = this.actions$.pipe(map(() => ({ type: 'ANOTHER'})), filter(() => false));

          @Effect({ dispatch: false })
          logger$ = this.actions$.pipe(tap(console.log));

          constructor(private actions$: Actions) {}
        }
      `,
      './src/app/app.module.ts': `
        import { BrowserModule } from '@angular/platform-browser';
        import { NgModule } from '@angular/core';

        import { AppComponent } from './app.component';
        import { StoreModule } from '@ngrx/store';
        import { StoreDevtoolsModule } from '@ngrx/store-devtools';
        import { environment } from '../environments/environment';
        import { EffectsModule } from '@ngrx/effects';
        import { AppEffects } from './app.effects';
        import { counterReducer } from './counter.reducer';

        @NgModule({
          declarations: [
            AppComponent
          ],
          imports: [
            BrowserModule,
            StoreModule.forRoot({ count: counterReducer }),
            !environment.production ? StoreDevtoolsModule.instrument() : [],
            EffectsModule.forRoot([AppEffects])
          ],
          providers: [],
          bootstrap: [AppComponent]
        })
        export class AppModule { }
      `,
      './src/app/counter.reducer.ts': `
        import { Action } from '@ngrx/store';

        export const INCREMENT = 'INCREMENT';
        export const DECREMENT = 'DECREMENT';
        export const RESET = 'RESET';

        const initialState = 0;

        export function counterReducer(state: number = initialState, action: Action) {
          switch (action.type) {
            case INCREMENT:
              return state + 1;

            case DECREMENT:
              return state - 1;

            case RESET:
              return 0;

            default:
              return state;
          }
        }
      `,
    }))
    // Run the e2e tests against a prod build.
    .then(() => ng('e2e', '--prod'));
}
