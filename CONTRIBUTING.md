# Contributing

Thanks for contributing to `apidog-tests-mcp`.

## Development Setup

1. Install dependencies:

```bash
npm install
```

2. Run checks:

```bash
npm run format:check
npm run typecheck
npm test
npm run build
```

## Pull Request Guidelines

- Keep PRs focused and small.
- Add or update tests for behavior changes.
- Update docs when adding or changing tools.
- Do not commit secrets or internal/private company data.

## Versioning and Releases

This repo uses Changesets.

For user-facing changes, add a changeset:

```bash
npm run changeset
```

Choose `patch`, `minor`, or `major` based on change impact.
