$aimContents = "./aim";

if (-not (Test-Path -Path $aimContents)) {
  $aimDrivers = $aimContents + "/aim_drivers.zip"
  $aimCli = $aimContents + "/aim_ll.zip"

  echo "Arsenal Image Mounter files not found in cache. Downloading..."

  New-Item -Type Directory -Path $aimContents

  # Download AIM Drivers and validate hash
  Invoke-WebRequest "https://github.com/ArsenalRecon/Arsenal-Image-Mounter/raw/988930e4b3180ec34661504e6f9906f98943a022/DriverSetup/DriverFiles.zip" -OutFile $aimDrivers -UseBasicParsing
  $aimDriversDownloadHash = (Get-FileHash  $aimDrivers -a sha256).Hash
  If ($aimDriversDownloadHash -ne "1F5AA5DD892C2D5E8A0083752B67C6E5A2163CD83B6436EA545508D84D616E02") {
    throw "aim_drivers.zip hash is ${aimDriversDownloadHash} which didn't match the known version."
  }

  # Download AIM CLI and validate hash
  Invoke-WebRequest "https://github.com/ArsenalRecon/Arsenal-Image-Mounter/raw/988930e4b3180ec34661504e6f9906f98943a022/Command%20line%20applications/aim_ll.zip" -OutFile $aimCli -UseBasicParsing
  $aimCliDownloadHash = (Get-FileHash $aimCli -a sha256).Hash
  If ($aimCliDownloadHash -ne "9AD3058F14595AC4A5E5765A9746737D31C219383766B624FCBA4C5ED96B20F3") {
    throw "aim_ll.zip hash is ${aimCliDownloadHash} which didn't match the known version."
  }
} else {
  echo "Arsenal Image Mounter files found in cache. Skipping download."
}
