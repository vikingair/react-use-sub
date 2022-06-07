# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2022-06-07
### Added
- [Migration Guide Next](https://github.com/fdc-viktor-luft/react-use-sub/blob/master/MIGRATIONGUIDE.md#300)

### Changed
- Not compatible anymore to earlier versions of React than 18, because
  it makes use of the new hook `useSyncExternalStore` and relies on automatic batching.

## [2.2.2] - 2022-02-15
### Fixed
- Generating type interface instead of shipping real types to prevent TS errors for consumers.

## [2.2.1] - 2021-11-01
### Fixed
- Include React 17 as valid peer dependency.

## [2.2.0] - 2021-07-06
### Changed
- Optional state does not need to be initialized with explicit `undefined` value anymore.
  The store updates allow now also to set data that does not belong into the store. Using
  strict TS checks, should avoid this to happen, so it's not enforced by the given code
  anymore.

## [2.1.1] - 2021-06-30
### Fix
- NextJS stopped working because setting `"type": "module"` in own `package.json` was overriding
  the default of the package importer. Hence, the package could only be used as ESM.

## [2.1.0] - 2021-05-02
### Added
- `Store.listen` allows adding (and removing) listeners on the store outside react components.

## [2.0.0] - 2021-03-21
### Added
- [Migration Guide v2](https://github.com/fdc-viktor-luft/react-use-sub/blob/master/MIGRATIONGUIDE.md#200)

### Changed
- Allowing `undefined` types on top-level thanks to
  [hint](https://github.com/microsoft/TypeScript/issues/13195#issuecomment-802213410)
  of [@InExtremaRes](https://github.com/InExtremaRes).

## [1.2.0] - 2021-03-17
### Added
- Test-Util `react-use-sub/test-util`. [More details](https://github.com/fdc-viktor-luft/react-use-sub#testing).

## [1.1.1] - 2021-03-14
### Changed
- Node version >= 12 requirement. Possibly still works with older Node versions.

## [1.1.0] - 2020-09-03
### Added
- Conditional store updates.

## [1.0.4] - 2020-09-03
### Added
- Improve IDE auto-import by moving index file into root directory.

## [1.0.3] - 2020-08-28
### Added
- Fix rarely omitted re-rendering

## [1.0.2] - 2020-08-17
### Added
- Fix error on update with external deps

## [1.0.1] - 2020-04-08
### Added
- Export some utility types
- Lower peer deps requirements

## [1.0.0] - 2020-02-06
### Added
- Publish first stable version
