# Install nodejs and yarn via Chocolatey.
choco install nodejs --version 12.1.0 --no-progress
choco install yarn --version 1.17.3 --no-progress

# Add PATH modifications to the Powershell profile. This is the win equivalent of .bash_profile.
# https://docs.microsoft.com/en-us/previous-versions//bb613488(v=vs.85)
new-item -path $profile -itemtype file -force
# Paths for nodejs, npm, and yarn. Use single quotes to prevent interpolation.
Add-Content $profile '$Env:path += ";C:\Program Files\nodejs\;C:\Users\circleci\AppData\Roaming\npm\;C:\Program Files (x86)\Yarn\bin\;"'
