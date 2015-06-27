echo ""
echo "updating scripts from code.angularjs.org"

curl -o web_modules/angular2.dev.js "https://code.angularjs.org/$1/angular2.dev.js"
curl -o web_modules/angular2.js "https://code.angularjs.org/$1/angular2.js"
curl -o web_modules/angular2.min.js "https://code.angularjs.org/$1/angular2.min.js"
curl -o web_modules/router.dev.js "https://code.angularjs.org/$1/router.dev.js"
curl -o web_modules/router.dev.js.map "https://code.angularjs.org/$1/router.dev.js.map"
curl -o web_modules/mock.dev.js "https://code.angularjs.org/$1/mock.dev.js"
curl -o web_modules/mock.dev.js.map "https://code.angularjs.org/$1/mock.dev.js.map"

curl -o web_modules/system.js  "https://cdn.rawgit.com/systemjs/systemjs/$2/dist/system.js"
curl -o web_modules/system.js.map  "https://cdn.rawgit.com/systemjs/systemjs/$2/dist/system.js.map"
curl -o web_modules/system.src.js  "https://cdn.rawgit.com/systemjs/systemjs/$2/dist/system.src.js"

curl -o web_modules/Reflect.js  "https://cdn.rawgit.com/rbuckton/ReflectDecorators/$3/Reflect.js"
curl -o web_modules/Reflect.js.map  "https://cdn.rawgit.com/rbuckton/ReflectDecorators/$3/Reflect.js.map"

curl -o web_modules/traceur-runtime.js  "https://cdn.rawgit.com/jmcriffey/bower-traceur-runtime/$4/traceur-runtime.js"
curl -o web_modules/traceur-runtime.min.js  "https://cdn.rawgit.com/jmcriffey/bower-traceur-runtime/$4/traceur-runtime.min.js"
curl -o web_modules/traceur-runtime.min.js.map  "https://cdn.rawgit.com/jmcriffey/bower-traceur-runtime/$4/traceur-runtime.min.js.map"

echo "done!"
echo ""
