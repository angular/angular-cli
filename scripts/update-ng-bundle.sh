echo ""
echo "updating scripts from code.angularjs.org"

cp ./angular/dist/bundle/. ./web_modules/ -R

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
