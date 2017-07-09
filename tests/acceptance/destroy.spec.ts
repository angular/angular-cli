import { ng, setupProject } from '../helpers';

describe('Acceptance: ng destroy', () => {
  setupProject();

  it('without args should fail', (done) => {
    return ng(['destroy'])
      .then(() => done.fail())
      .catch(error => {
        expect(error.message).toBe('The destroy command is not supported by Angular CLI.');
        done();
      });
  });

  it('with args should fail', (done) => {
    return ng(['destroy', 'something'])
      .then(() => done.fail())
      .catch(error => {
        expect(error.message).toBe('The destroy command is not supported by Angular CLI.');
        done();
      });
  });
});
