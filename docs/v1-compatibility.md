# Version 1 compatibility contract

This document records the public MCP contract established by
`@granitebps/twitter-mcp` 1.0.0. Patch and minor releases in the 1.x line
preserve this contract. A breaking change belongs in a new major release and
must be explicitly documented.

## Runtime and transport

- The server runs over standard input/output (`stdio`).
- The executable is `twitter-mcp` from the `@granitebps/twitter-mcp` npm
  package.
- Node.js 22.21.0 or a newer Node 22 release is supported. Node 23 and later
  are outside the current Rettiwt dependency's supported range.
- `TWITTER_MODE` selects `rettiwt` (the default) or `api`.
- Both providers expose the same public tool names and normalized result
  shapes. Provider-specific search syntax and upstream availability may differ.

## Tools

All tools are read-only, non-destructive, idempotent, and access an open-world
service.

| Tool                | Input                                                                                                  | Structured result                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| `get_tweet`         | `tweet_id`: a 10–20 digit post ID or an `x.com`/`twitter.com` status URL                               | `{ tweet }`                                       |
| `get_tweet_replies` | `tweet_id`; optional integer `max_results` from 1–100, default 10                                      | A page object                                     |
| `get_user_profile`  | `username`: 1–15 letters, numbers, or underscores; a leading `@` is accepted                           | `{ profile }`                                     |
| `search_tweets`     | trimmed, non-empty `query` up to 512 characters; optional integer `max_results` from 1–100, default 10 | A page object                                     |
| `get_server_info`   | No fields                                                                                              | Server version, provider, tools, and capabilities |

`get_server_info.tools` lists the four Twitter operations and does not include
`get_server_info` itself.

## Result shapes

A tweet has:

- required string `id` and `text`;
- optional string `created_at`;
- optional or null `author`, containing required `name` and `username` plus
  optional `verified` and `blue_verified` flags;
- required non-negative integer metrics: `likes`, `retweets`, `replies`,
  `quotes`, and `bookmarks`; `views` is optional.

A profile has required string `id`, `name`, and `username`, a required boolean
`verified`, and required non-negative integer metrics for `followers_count`,
`following_count`, `tweet_count`, and `listed_count`. Description, creation
time, blue verification, image URL, location, URL, and `likes_count` are
optional.

A page has an `items` array and may include `nextCursor`, `partial`, and
`warnings`. Each warning has string `code` and `message` fields.

Successful calls provide both MCP structured content and JSON text for older
clients. For single-object tools, the JSON text is the object itself. For page
tools, the JSON text is the `items` array while structured content contains the
complete page, including pagination and warnings.

## Errors

Tool failures set `isError: true`. Their structured content is:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "safe message",
    "provider": "rettiwt",
    "retryable": false
  }
}
```

`retryAfterSeconds` is included when the upstream service supplies it. The
stable error codes are `INVALID_INPUT`, `AUTH_REQUIRED`, `AUTH_FAILED`,
`NOT_FOUND`, `RATE_LIMITED`, `UPSTREAM_UNAVAILABLE`, `TIMEOUT`,
`UNSUPPORTED_OPERATION`, and `INTERNAL_ERROR`. Messages must not expose
credentials or raw upstream response bodies.

## Compatible changes within 1.x

The following changes are compatible when existing behavior remains intact:

- adding optional result fields;
- improving provider mappings, redaction, diagnostics, or documentation;
- supporting additional search syntax without removing existing syntax;
- adding a new provider behind explicit configuration;
- adding a new tool without renaming or changing an existing tool.

The following require a new major version:

- removing or renaming a tool, input field, result field, or error code;
- making an optional input or result field required;
- narrowing accepted input ranges or formats;
- changing page text content away from the JSON item array;
- changing the package name, executable name, or `stdio` transport;
- changing an existing field's type or established meaning.

Provider rate limits, upstream search behavior, returned data availability, and
authentication requirements are operational behavior rather than guarantees of
this contract.
