@ECHO OFF

if exist "C:\Program Files\Git\bin\bash.exe" (
  set "BASH=C:\Program Files\Git\bin\bash.exe"
)

"%BASH%" -c "tar %*"
