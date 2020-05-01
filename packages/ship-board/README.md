ship-board
==========

Upload Ship projects to OneDrive or SharePoint Online.

This app requires another Application registration in Azure AD. Luckily it's
pretty simple.

1. Choose whatever name that suits you.
2. Add `Files.ReadWrite.All`, `Sites.ReadWrite.All`, and `User.Read` delegated
   permissions.
3. Add a web platform with a redirect URL to `http://localhost`. This is safe
   and it won't be actually utilized for anything, but it's just a requirement
   for the device code auth flow for whatever reason.
4. It might be necessary to set the default client type to public. This is
   slightly confusing because now you'll see that this is a required mode for
   auth flows that don't use the redirect URL. However, the redirect URL is
   still *MANDATORY* for those same flows.
5. Grab all the info required by the config.


Configuration
-------------

`ship-board` can be configured with either environment variables or with a config
file, or mix of both. If both configuration methods are mixed then the environment
variables that have truthy values will take precedence over properties set in
the config file. The default config file name is `ship-config.json` and it can be
changed from `src/config.ts`.

| Env                   | Description                   |
|-----------------------|-------------------------------|
| `TENANT`              | Tenant FQDN                   |
| `AUTHORITY_HOST_URL`  | Authority URL                 |
| `CLIENT_ID`           | Client ID	                    |
| `SPO_ROOT`            | Path to Ship's root folder    |
| `DOMAIN`			    | Domain folder name            |

```json
{
  "tenant": "YOU.onmicrosoft.com",
  "authorityHostUrl": "https://login.microsoftonline.com",
  "clientId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "spoRoot": "/sites/root/drive/root:%2Fship-demo",
  "domain": "test.com"
}
```

By default the config file and a file called `.ignore` will be ignored, and thus
won't be uploaded. As the name suggests, the `.ignore` file can be used to
configure additional ignore patterns in .git style.


Boarding to a Ship
------------------

First you need to decide how you want to feed to configuration to
`ship-board`, i.e. either using env, a config file, or both.

If you are using node.js/npm/yarn for your project you might want to consider
installing `ship-board` as a dev dependency.

Once configured, uploading a project is fairly easy. In fact, there is only one
step (assuming yarn):

```
$ yarn ship-board
```

If you instead decide to install `ship-board` globally with `npm` then you can
run:

```
ship-board
```

Oh, and the command also accepts an argument, that's the directory to be
uploaded:

```
ship-board ./path/to/my/cool/website
```


FAQ
---

**Why doesn't it support application authentication with a secret?**

This would be really cool but currently AAD/Graph API/OneDrive doesn't allow
fine grained access control. This means that you would be giving the whatever
app secret token write access to all your files. I don't want you to risk your
data.

However, we are lucky and Microsoft is working on this:
https://microsoftgraph.uservoice.com/forums/920506-microsoft-graph-feature-requests/suggestions/37796059-restrict-permissions-to-app-only-azure-ad-applicat?page=1&per_page=20

Once that is implemented then alternative authentication methods will be
implemented into `ship-board`.

**How to run this in a CI or GitHub action?**

See above.

**Is this a deploy tool?**

No, this is a specialized file uploader for OneDrive and SharePoint Online. A
deploy tool typically sets up a domain name, server configuration, or whatever
people consider as making a deployment of something. This tool does none of those
for you. `ship-board` is comparable to an FTP client.
