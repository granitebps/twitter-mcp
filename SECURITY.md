# Security policy

## Supported versions

Security fixes target the latest published release.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability or exposed credential. Use GitHub's private vulnerability reporting for this repository. Include the affected version, impact, reproduction steps, and any proposed mitigation.

Never include a Rettiwt key, X API token, cookie, password, or authorization header in a report. Revoke and replace any credential that may have been exposed.

## Credential model

This server reads credentials from its process environment and does not persist them. A `RETTIWT_API_KEY` contains encoded X session cookies and must be protected like an account session. Restrict access to MCP client configuration files and avoid passing secrets on the command line.
