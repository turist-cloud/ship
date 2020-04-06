Configuration
=============

Global Configuration
--------------------

Currently the global configuration is located in the source tree in
`src/config.ts`.

Site Configuration
------------------

Sites have some configuration variables that can be customized by creating a
JSON file for the site to the `ROOT` folder. The configuration files are
named and created per hostname/domain name. All config properties are
optional.

| Name            | Description                           |
|-----------------|---------------------------------------|
| `customErrors`  | Custom error pages (or functions).    |
| `dirListing`    | Enable or disable directory listings. |
| `functions`     | Enable the functions feature.         |

**example.com.json:**

```json
{
	"customErrors": {
		"404": "/404.html",
		"500": "/500/index.html"
	},
	"dirListing": true,
	"functions": true
}
```
