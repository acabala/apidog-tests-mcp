# Practical Usage Guide

This guide captures real-world usage patterns for building reliable Apidog tests through this MCP server.

## 1) Creating Test Cases That Actually Execute

When calling `create_test_case`, include all of the following:

1. `path` set to the endpoint route (for example: `/v1/organisations/{organisationId}/contacts/{contactId}`)
2. `parameters.path` entries for each route placeholder
3. Working `auth` configuration (for example bearer token variables)
4. A valid `responseId` (prefer one discovered from an existing case on the same endpoint)

### Path Parameter Pattern

Each path placeholder should map to an Apidog variable.

```json
{
	"parameters": {
		"path": [
			{
				"id": "organisationId#0",
				"name": "organisationId",
				"relatedName": "organisationId",
				"value": "{{organisationId}}",
				"type": "string",
				"enable": true
			}
		],
		"query": [],
		"header": [],
		"cookie": []
	}
}
```

If `path` is missing or parameter placeholders are not wired, the case may execute against only the base URL.

## 2) Building Scenarios with Steps

`update_test_scenario_steps` fully replaces steps, so send the complete final array.

Each step should include:

- `id` (stable unique value)
- `bindId` (endpoint `apiDetailId`)
- `httpApiCase.testSuiteId` equal to the scenario ID
- `httpApiCase.path`
- `httpApiCase.parameters.path` mapping route placeholders
- `httpApiCase.projectId` and `httpApiCase.moduleId`

## 3) Updating Suite Items Correctly

Suite items are grouped, not flat IDs.

Use `update_test_suite_items` with groups such as:

- `STATIC_TEST_CASE` + `testCaseIds`
- `STATIC_TEST_SCENARIO` + `testScenarioIds`
- `DYNAMIC_TEST_CASE` or `DYNAMIC_TEST_SCENARIO` + `folderId`

The server normalizes these groups into the nested payload shape expected by Apidog.

## 4) Using Test Data for Iterations

Attach test data to test cases with `create_test_data`:

- `relatedType` is `2` for test cases
- `data` is CSV text (header row + values)
- `columns` must define each CSV header key

Example:

```json
{
	"relatedId": 123456,
	"environmentId": 0,
	"data": "contactId\n11111111-1111-1111-1111-111111111111\n22222222-2222-2222-2222-222222222222",
	"columns": {
		"contactId": {
			"generator": {
				"type": "mock",
				"config": {
					"callee": "$special.manual"
				}
			}
		}
	}
}
```

In requests you can reference values as `{{contactId}}`.

## 5) Known Apidog API Quirks

- `DELETE` often requires JSON body `{ "id": <resourceId> }`
- `PUT` behaves as full-replace (this server uses GET-then-merge in update tools to avoid field loss)
- Post-assertions are most reliable with `customScript` processors

Custom assertion example:

```json
{
	"type": "customScript",
	"data": "pm.test('Status code is 200', function () { pm.response.to.have.status(200); });",
	"enable": true
}
```

## 6) Recommended Flow for New Endpoint Coverage

1. Discover endpoint via `list_api_endpoints`
2. Inspect an existing similar test with `get_test_case`
3. Create positive/negative/boundary cases with `create_test_case`
4. Add data-driven inputs with `create_test_data` where needed
5. Chain into scenarios with `create_test_scenario` + `update_test_scenario_steps`
6. Group for CI with `create_test_suite` + `update_test_suite_items`
