# `@shiguang-gateway/network-guard`

Transport-neutral outbound URL validation and SSRF guard primitives.

This package contains only pure URL parsing and host classification. It does not access a
database, feature flags, framework request objects, or application services. Policy that depends
on runtime configuration remains in the owning application/domain package.
