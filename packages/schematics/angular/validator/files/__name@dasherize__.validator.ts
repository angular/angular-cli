import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function <%= camelize(name) %>Validator(someParam: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const error: ValidationErrors = { <%= camelize(name) %>Error: true };

    // Your validator logic goes here. EXAMPLE:
    if (control && control.value === someParam) {
      control.setErrors(error);
      return error;
    }

    control.setErrors(null);
    return null;
  };
}
