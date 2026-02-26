# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and versions are managed with Changesets.

## [0.0.4] - 2026-02-25

- Add pagination support to list_test_cases (page, pageSize params)
- Use compact JSON and strip moduleId/projectId from list_test_cases response

## [0.0.3] - 2026-02-25

- Optimize list_test_scenarios and list_test_suites to return compact summaries (essential fields only, no pretty-print) — reduces token usage by ~80%

## [0.0.2]

- Security hardening for public release readiness
- OSS governance and release automation setup
