import { ng } from '../../utils/process';
import { writeFile } from '../../utils/fs';

export default async function () {
  await writeFile(
    'src/app/app.spec.ts',
    `
  import { TestBed } from '@angular/core/testing';
  import { App } from './app';

  describe('App', () => {
    beforeAll(() => {
      jasmine.clock().install();
    });

    afterAll(() => {
      jasmine.clock().uninstall();
    });

    beforeEach(() => TestBed.configureTestingModule({
      imports: [App]
    }));

    it('should create the app', () => {
      const fixture = TestBed.createComponent(App);
      expect(fixture.componentInstance).toBeTruthy();
    });
  });
  `,
  );

  await ng('test', '--watch=false');
}
