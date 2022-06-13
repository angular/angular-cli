$aimContents = "./aim";

if (-not (Test-Path -Path $aimContents)) {
  echo "Arsenal Image Mounter files not found in cache. Downloading..."

  # Download AIM Drivers and validate hash
  Invoke-WebRequest "https://github.com/ArsenalRecon/Arsenal-Image-Mounter/raw/988930e4b3180ec34661504e6f9906f98943a022/DriverSetup/DriverFiles.zip" -OutFile "aim_drivers.zip" -UseBasicParsing
  $aimDriversDownloadHash = (Get-FileHash aim_drivers.zip -a sha256).Hash
  If ($aimDriversDownloadHash -ne "1F5AA5DD892C2D5E8A0083752B67C6E5A2163CD83B6436EA545508D84D616E02") {
    throw "aim_drivers.zip hash is ${aimDriversDownloadHash} which didn't match the known version."
  }
  Expand-Archive -Path "aim_drivers.zip" -DestinationPath $aimContents/drivers

  # Download AIM CLI and validate hash
  Invoke-WebRequest "https://github.com/ArsenalRecon/Arsenal-Image-Mounter/raw/988930e4b3180ec34661504e6f9906f98943a022/Command%20line%20applications/aim_ll.zip" -OutFile "aim_ll.zip" -UseBasicParsing
  $aimCliDownloadHash = (Get-FileHash aim_ll.zip -a sha256).Hash
  If ($aimCliDownloadHash -ne "9AD3058F14595AC4A5E5765A9746737D31C219383766B624FCBA4C5ED96B20F3") {
    throw "aim_ll.zip hash is ${aimCliDownloadHash} which didn't match the known version."
  }
  Expand-Archive -Path "aim_ll.zip" -DestinationPath $aimContents/cli
} else {
  echo "Arsenal Image Mounter files found in cache. Skipping download."
}

# Install AIM drivers
./aim/cli/x64/aim_ll.exe --install ./aim/drivers

# Setup RAM disk mount. Same parameters as ImDisk
# See: https://support.circleci.com/hc/en-us/articles/4411520952091-Create-a-windows-RAM-disk
./aim/cli/x64/aim_ll.exe -a -s 5G -m X: -p "/fs:ntfs /q /y"
