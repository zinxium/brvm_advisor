# Changelog

## [Unreleased]

### Fixed
- **Performance optimization**: Fixed `sendMessage` useCallback dependency array issue
  - Removed `input`, `loading`, and `messages` from dependencies to prevent constant callback recreation
  - Implemented `useRef` pattern to maintain references to current state values
  - Callback now remains stable with empty dependency array `[]`
  - Eliminates React DevTools warning about callback recreation on every keystroke
