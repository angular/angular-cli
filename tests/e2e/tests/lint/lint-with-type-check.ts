import { ng } from '../../utils/process';
import { writeFile } from '../../utils/fs';


export default function () {
  // TODO(architect): Figure out how this test should look like post devkit/build-angular.
  return;

  const fileName = 'src/app/foo.ts';
  const fileContents = `
const ANIMATION_CSS_VALUE_REGEX = 'asda';
const a = ["asda", 'asda', 'asdasd', "ASDASDAS"];
const b = "asdasd";
const c = {
  a: "sadas",
  b: {
    v: "asdasda",
    s: ["asda", "asdas", 10, true, "asda"],
  }
};

function check(val: any, fxState: any) {
  if (typeof val === "string" && val.indexOf(" ") < 0) {
    let r = val.match(ANIMATION_CSS_VALUE_REGEX);
    let num = parseFloat(r[1]);

    if (!isNaN(num)) {
      fxState.num = num + "";
    }
    fxState.unit = (r[0] !== r[2] ? r[2] : "");

  } else if (typeof val === "number") {
    fxState.num = val + "";
  }
}

  `;

  return Promise.resolve()
    .then(() => writeFile(fileName, fileContents))
    .then(() => ng('lint', 'app', '--fix'))
    .then(() => ng('lint', 'app'))
    .then(({ stdout }) => {
      if (!stdout.match(/All files pass linting./)) {
        throw new Error('All files pass linting.');
      }
    });
}
