# apidog-tests-mcp

MCP (Model Context Protocol) server for managing Apidog test cases, scenarios, suites, and test data. Gives AI assistants full read/write access to Apidog's test management features.

> This project is not an official Apidog integration.

## Features

- **Test Cases** -- Create, read, update, delete, and bulk-create test cases for API endpoints
- **Test Scenarios** -- Build multi-step test flows chaining multiple API calls
- **Test Suites** -- Organize tests into runnable suites for CI/CD
- **Test Data** -- Manage data-driven test iterations with CSV-formatted data
- **Folders** -- Organize scenarios and suites into nested folder structures
- **Read-only tools** -- List environments, endpoints, categories, tags, runners, and coverage statistics

## Documentation

- `docs/PRACTICAL-USAGE.md` -- proven patterns for creating stable test cases/scenarios/suites
- `SECURITY.md` -- vulnerability reporting and secure usage guidelines
- `CONTRIBUTING.md` -- contribution workflow
- `CHANGELOG.md` -- release notes

## Installation

```bash
npm install -g @acabala/apidog-tests-mcp
```

Or use directly with npx:

```bash
npx @acabala/apidog-tests-mcp
```

## Configuration

The server requires these environment variables:

| Variable              | Required | Description                                                          |
| --------------------- | -------- | -------------------------------------------------------------------- |
| `APIDOG_ACCESS_TOKEN` | Yes      | Your Apidog access token                                             |
| `APIDOG_PROJECT_ID`   | Yes      | The Apidog project ID                                                |
| `APIDOG_BRANCH_ID`    | Yes      | The branch ID to work with                                           |
| `APIDOG_BASE_URL`     | No       | Override the API base URL (default: `https://api.apidog.com/api/v1`) |

### MCP Client Configuration

Add to your MCP client config (e.g. Claude Desktop `claude_desktop_config.json`):

```json
{
	"mcpServers": {
		"apidog-tests": {
			"command": "npx",
			"args": ["@acabala/apidog-tests-mcp"],
			"env": {
				"APIDOG_ACCESS_TOKEN": "your-token",
				"APIDOG_PROJECT_ID": "your-project-id",
				"APIDOG_BRANCH_ID": "your-branch-id"
			}
		}
	}
}
```

### Recommended Token Practices

- Use a dedicated token for automation.
- Scope access to the minimum required Apidog project(s).
- Rotate tokens regularly.
- Keep MCP client config files local/private.

## Available Tools

### Read-only

| Tool                        | Description                                            |
| --------------------------- | ------------------------------------------------------ |
| `list_environments`         | List all environments with base URLs                   |
| `list_api_endpoints`        | List API endpoint tree (filterable by module and name) |
| `list_test_case_categories` | List test case categories                              |
| `list_test_case_tags`       | List available tags                                    |
| `list_runners`              | List self-hosted test runners                          |
| `get_endpoint_statistics`   | Get test coverage statistics                           |

### Test Cases

| Tool                     | Description                                  |
| ------------------------ | -------------------------------------------- |
| `list_test_cases`        | List all test cases (filterable by endpoint) |
| `get_test_case`          | Get full test case details                   |
| `create_test_case`       | Create a test case for an endpoint           |
| `create_test_cases_bulk` | Create multiple test cases at once           |
| `update_test_case`       | Update a test case (GET-then-merge)          |
| `delete_test_case`       | Delete a test case                           |

### Test Scenarios

| Tool                         | Description                          |
| ---------------------------- | ------------------------------------ |
| `list_test_scenarios`        | List scenarios with folder structure |
| `get_test_scenario_steps`    | Get steps for a scenario             |
| `create_test_scenario`       | Create a multi-step test scenario    |
| `update_test_scenario_steps` | Set/replace scenario steps           |
| `delete_test_scenario`       | Delete a scenario                    |

### Test Suites

| Tool                      | Description                             |
| ------------------------- | --------------------------------------- |
| `list_test_suites`        | List suites with folder structure       |
| `get_test_suite`          | Get full suite details                  |
| `create_test_suite`       | Create a test suite                     |
| `update_test_suite_items` | Set suite items (static/dynamic groups) |
| `delete_test_suite`       | Delete a suite                          |

### Test Data

| Tool               | Description                             |
| ------------------ | --------------------------------------- |
| `list_test_data`   | List test data records for a test case  |
| `get_test_data`    | Get test data with CSV rows and columns |
| `create_test_data` | Create test data for a test case        |
| `update_test_data` | Update test data (GET-then-merge)       |
| `delete_test_data` | Delete a test data record               |

### Folders

| Tool                     | Description              |
| ------------------------ | ------------------------ |
| `create_scenario_folder` | Create a scenario folder |
| `delete_scenario_folder` | Delete a scenario folder |
| `create_suite_folder`    | Create a suite folder    |

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run start:dev

# Type check
npm run typecheck

# Format
npm run format

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build for production
npm run build
```

## Security

- Use a dedicated automation token with minimal required permissions.
- Never commit `APIDOG_ACCESS_TOKEN` or environment-specific IDs.
- Keep local MCP client config files private.
- See `SECURITY.md` for reporting and response policy.

## Release and Versioning

This repository uses Changesets and a GitHub Actions release workflow:

- Add a changeset for user-visible changes: `npm run changeset`
- Release automation creates/updates a version PR on `main`
- Merged release PR publishes to npm with provenance

## Open Source Guidelines

- Contribution guide: `CONTRIBUTING.md`
- Code of conduct: `CODE_OF_CONDUCT.md`
- Changelog: `CHANGELOG.md`

## Practical Tips

- Always include `path` and `parameters.path` when creating route-parameterized test cases.
- For update operations, prefer this server's merge-style tools over raw full-replace payloads.
- Use `customScript` post-processors for assertions to avoid runner issues with declarative assertions.
- See `docs/PRACTICAL-USAGE.md` for complete examples.

## Project Structure

```
src/
  index.ts          Entry point, registers tools and starts MCP server
  client.ts         ApidogClient HTTP wrapper with auth headers
  types.ts          Shared TypeScript interfaces and MCP result helpers
  errors.ts         Custom error classes (ApidogApiError, ApidogConfigError)
  schemas.ts        Shared Zod schemas for request parameters
  tools/
    read.ts         Read-only tools (environments, endpoints, categories, etc.)
    test-cases.ts   Test case CRUD tools
    test-scenarios.ts  Test scenario CRUD tools
    test-suites.ts  Test suite CRUD tools
    test-data.ts    Test data CRUD tools
    folders.ts      Folder management tools
```

## License

[MIT License](LICENSE)
