# Twitter/X MCP v1.1.0

Version 1.1.0 adds attached media to posts read through Rettiwt.

## Changes

- `get_tweet`, `get_tweet_replies`, and `search_tweets` now return an optional
  `media` array when Rettiwt supplies it. Each item contains `id`, `type`
  (`PHOTO`, `VIDEO`, or `GIF`), `url`, and optional `thumbnail_url`.
- Exported `TweetMediaSchema` and the `TweetMedia` type for library consumers.
- Added focused tests for media mapping and propagation through provider and
  MCP outputs. A live MCP check returned both photos from a public X post.

## Install

Run the exact version with Node.js 22.21.0 or a newer Node 22 release:

```bash
npx -y @granitebps/twitter-mcp@1.1.0
```

The default Rettiwt provider requires `RETTIWT_API_KEY`. Official API mode
requires `TWITTER_MODE=api` and either `TWITTER_BEARER_TOKEN` or a complete
OAuth credential set. See the
[client configuration guide](https://github.com/granitebps/twitter-mcp/blob/v1.1.0/README.md#client-configuration)
for setup examples. Restart the MCP client after updating.

## Compatibility

Media is an optional addition to the existing tweet output. Tool names,
inputs, existing result fields, and error codes are unchanged. Dependencies
and the declared Node engine range are unchanged. The
[v1 compatibility contract](https://github.com/granitebps/twitter-mcp/blob/v1.1.0/docs/v1-compatibility.md)
continues to apply.

## Known limitations

- Attached media is currently returned only in Rettiwt mode. Official API
  mode does not return media.
- The server returns media links and does not download files or create posts.
- Media availability depends on the upstream response. Rettiwt uses
  unofficial X endpoints and may break when X changes them.
- Rettiwt keys contain authenticated X session cookies and must remain secret.
- This package and Rettiwt 7.1.4 declare `engines.node: "^22.21.0"`.
  Node 24 installations can warn or fail under `engine-strict`; see the README
  for the distinction between tested behavior and declared support.
- Credentialed live checks remain separate from deterministic CI and release
  automation.
