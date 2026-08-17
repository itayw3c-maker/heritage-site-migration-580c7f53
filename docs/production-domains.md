# Production domains

Last verified: 2026-08-17

## Canonical host

- Canonical public URL: `https://www.rrshamaut.co.il/`
- Lovable project: `84e35538-730b-4b9b-bb23-6c04421a2835`
- GitHub repository: `itayw3c-maker/heritage-site-migration-580c7f53`
- Deployments are triggered from GitHub commits. Do not use the Lovable build agent for repository changes.

## DNS records

Both web records must point directly to Lovable and remain **DNS only** in Cloudflare:

| Type | Name | Value | Proxy status |
| --- | --- | --- | --- |
| A | `@` | `185.158.133.1` | DNS only |
| A | `www` | `185.158.133.1` | DNS only |

The apex record was reconnected through Lovable/Entri on 2026-08-17. Lovable warned that activation may take up to 48 hours. During propagation, the apex may continue returning the previous `421 Misdirected Request`; `www` remains the canonical and live host.

## Cloudflare limitation

Cloudflare Cache Rules and Redirect Rules in account `e577935440b1bb9b9245eaf552562ffb` do not affect the live web hosts while their A records are DNS only. Do not treat dashboard rules as active production behavior unless response headers prove that traffic is proxied through this zone.

The repository's `public/_headers` file is still the preferred source-controlled cache policy. Lovable currently does not expose those `Cache-Control` headers on the custom domain, so cache improvements must be verified on live responses before being counted.

## Verification

Run these checks after DNS/domain activation completes:

```text
curl -I https://rrshamaut.co.il/
curl -I https://www.rrshamaut.co.il/
curl -I https://www.rrshamaut.co.il/wp-content/uploads/<versioned-asset>
```

Expected result:

- apex: `200`, or a single permanent redirect to the matching `www` URL;
- `www`: `200`;
- assets: `200`; count long-lived caching only when a suitable `Cache-Control` header is present.
