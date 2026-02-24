# Security Policy

## Supported Versions

This project follows a rolling-release model. Security fixes are shipped on the latest release on `main`.

## Reporting a Vulnerability

Do not open public GitHub issues for suspected vulnerabilities.

Please report security issues privately to:

- `adrian.cabala@loftyworks.com`

Include:

- Reproduction steps
- Impact assessment
- Suggested remediation (if available)

You can expect an initial response within 3 business days.

## Security Best Practices for Users

- Use a dedicated low-privilege Apidog token for automation.
- Rotate `APIDOG_ACCESS_TOKEN` regularly.
- Never commit tokens, branch IDs, or environment-specific internal IDs to public repositories.
- Keep MCP client configs in local/private files only.
