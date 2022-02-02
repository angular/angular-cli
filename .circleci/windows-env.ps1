# Add PATH modifications to the Powershell profile. This is the win equivalent of .bash_profile.
# https://docs.microsoft.com/en-us/previous-versions//bb613488(v=vs.85)
new-item -path $profile -itemtype file -force
# Paths for nodejs, npm, yarn, and msys2. Use single quotes to prevent interpolation.
# Add before the original path to use msys2 instead of the installed gitbash.
Add-Content $profile '$Env:path = "${Env:ProgramFiles}\nodejs\;C:\Users\circleci\AppData\Roaming\npm\;${Env:ProgramFiles(x86)}\Yarn\bin\;C:\Users\circleci\AppData\Local\Yarn\bin\;C:\tools\msys64\usr\bin\;" + $Env:path'
# Environment variables for Bazel
Add-Content $profile '$Env:BAZEL_SH = "C:\tools\msys64\usr\bin\bash.exe"'

# Get the bazelisk version devdep and store it in a global var for use in the circleci job.
$bazeliskVersion = & ${Env:ProgramFiles}\nodejs\node.exe -e "console.log(require('./package.json').devDependencies['@bazel/bazelisk'])"
# This is a tricky situation: we want $bazeliskVersion to be evaluated but not $Env:BAZELISK_VERSION.
# Formatting works https://stackoverflow.com/questions/32127583/expand-variable-inside-single-quotes
$bazeliskVersionGlobalVar = '$Env:BAZELISK_VERSION = "{0}"' -f $bazeliskVersion
Add-Content $profile $bazeliskVersionGlobalVar