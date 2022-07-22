Expand-Archive -Path ./aim/aim_ll.zip -DestinationPath ./aim/cli
Expand-Archive -Path ./aim/aim_drivers.zip -DestinationPath ./aim/drivers

# Install AIM drivers
./aim/cli/x64/aim_ll.exe --install ./aim/drivers
# Setup RAM disk mount. Same parameters as ImDisk
./aim/cli/x64/aim_ll.exe -a -s 4G -m X: -p "/fs:ntfs /q /y"
