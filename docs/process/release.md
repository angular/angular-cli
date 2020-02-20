# Release Steps
- Login as `angular` npm account
- Update Angular deps in `package.json`, `tools/defaults.bzl` and run `yarn install` to update the yarn.lock file - [Example Commit](https://github.com/angular/universal/commit/bf252680e41ff41d57db6172cb0532aea646b32c)
- Update the version in `package.json` - [Example Commit](https://github.com/angular/universal/commit/fccca4b49f198fb9b6a52877db58909ebb419369)
- Create a release commit
```sh
git commit -a -m "release: v9.0.0-next.13"  # (Update to version just put in package.json)
```
- Create a tag
```sh
git tag -v v9.0.0-next.13
```
- Push commit and tag
```sh
git push upstream && git push upstream --tags
```
- Publish
```sh
# For release with 'next' tag
./publish.sh next
```

```sh
# For release with 'latest' tag
./publish.sh latest
```

# Release Changelog
(TODO: Borrow the changelog from Angular CLI project. For now use these simple instructions)
- Get commits between the two releases
```sh
git log v9.0.0-next.12..v9.0.0-next.13 | xclip -selection clipboard
```
- Go to the `Releases` tab in the repository
- Click on the newly created tag (9.0.0-next.13 in this case)
- Paste the contents of clipboard to the contents
- Choose `This is a prerelase` checkbox for pre-release versions
