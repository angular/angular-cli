import { ng } from '../../utils/process';
import { writeFile } from '../../utils/fs';

export default async function () {
  await writeFile(
    'src/app/app.component.spec.ts',
    `
  import { TestBed } from '@angular/core/testing';
  import { RouterTestingModule } from '@angular/router/testing';
  import { AppComponent } from './app.component';

  describe('AppComponent', () => {
    beforeAll(() => {
      jasmine.clock().install();
    });

    afterAll(() => {
      jasmine.clock().uninstall();
    });

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [RouterTestingModule],
        declarations: [AppComponent],
      }).compileComponents();
    });

    it('should create the app', () => {
      const fixture = TestBed.createComponent(AppComponent);
      expect(fixture.componentInstance).toBeTruthy();
    });
  });
  `,
  );

  await ng('test', '--watch=false');
}
