TLS and HTTP/2
==============

Ship supports HTTP/1.1, HTTP/2 with and without TLS. HTTP/2 with TLS also
supports ALPN. To run Ship as a standalone (HTTPS) server without a
reverse-proxy in front the `SERVER_MODE` environment variable must be set to
`standalone`. This will enable a HTTP to HTTPS redirect server on `PORT_HTTP`
(default 80), that will only do HTTP to HTTPS redirect.

Enabling TLS
------------

Currently only static certificate files are supported and the files are
configured in `src/config.ts`. The array variable is called `TLS_STATIC_CERTS`.
Currently wildcard certificates don't work automatically and all domains and
subdomains must be configured separately.

TLS can be enabled by settings `ENABLE_TLS` environment variable to `1`. Any
other value for the env variable disables TLS.

In addition to providing certificate(s), a `dhparam` file must be created
by running the following command:

```
openssl dhparam -outform PEM -out dhparam.pem 2048
```

By default the file is located in the root directory but the location
can be changed in `config.ts`.


Setting Up HTTP
---------------

The following table presents an incomplete list of available configuration
combinations. TLS can be enabled for all of the listed configurations but
the ALPN mode requires `ENABLE_TLS=1`. The ALPN mode only supports the
redirect server and it's not to serve anything over HTTP/1.1 when TLS
is enabled `ENABLE_TLS=1`.

| HTTP Config         | default PORT | `SERVER_MODE` | `HTTP_VERSION` | `ENABLE_TLS` | `ENABLE_ALPN` |
|---------------------|-------------+|---------------|----------------|--------------|---------------|
| HTTP/1.1            |         3000 | `proxied`     | `1.1`          |              |               |
| HTTP/1.1            |           80 | `standalone`  | `2`            |              |               |
| HTTP/2              |         3000 | `proxied`     | `2`            |              |               |
| HTTPS/2 + HTTPS/1.1 |          443 | `standalone`  | `2`            | `1`          | `1`           |

The redirect server is only enabled if `ENABLE_TLS=1` and
`SERVER_MODE=standalone`. Both server ports can be also changed by setting
the `PORT` and `PORT_HTTP` environment variables. The latter controls the port
for the HTTP to HTTPS redirect server.
