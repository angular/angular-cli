import { AbstractControl, FormControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import Spy = jasmine.Spy;

import { <%= camelize(name) %>Validator } from './<%= dasherize(name) %>.validator';

describe('<%= camelize(name) %>Validator', () => {
  let control: AbstractControl;
  let spySetErrors: Spy;
  let validatorFn: ValidatorFn;

  const errorName = '<%= camelize(name) %>Error';
  const error: ValidationErrors = { [errorName]: true };
  const invalidValue = 'my invalid value';

  beforeEach(() => {
    control = new FormControl();
    validatorFn = <%= camelize(name) %>Validator(invalidValue);
    spySetErrors = spyOn(control, 'setErrors').and.callThrough();
  });

  it('should correctly set the error when the value is forbidden', () => {
    control.setValue(invalidValue);

    expect(validatorFn(control)).toEqual(error);
    expect(control.getError(errorName)).toBeTruthy();
  });

  it('should correctly return null when the value is allowed', () => {
    control.setValue('some value');

    expect(validatorFn(control)).toBeNull();
    expect(control.getError(errorName)).toBeFalsy();
  });
});
