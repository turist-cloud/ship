Azure AD Authentication
=======================

It's possible to protect websites with Azure AD authentication using a built-in
authenticator.

It's recommended to create a separate AAD Application for this purpose as the
configuration needs to be a bit different, and you also may want to have a
better control on what the users can do and who is allowed to use the App.
See Microsoft's [Node.js example](https://github.com/microsoftgraph/nodejs-security-sample/)
for how to setup a new application  in Microsoft Azure AD. In brief it needs to
be a Web API application with at least a *Redirect URI* to `/auth`, an
*API Permission* to do `User.read`, and finally you'll need an API secret.

| Environment variable	    | Description                       |
|---------------------------|-----------------------------------|
| `USE_AAD_CLIENT_ID`       | AAD Application Client ID.	    |
| `USE_AAD_CLIENT_SECRET`   | A client secret for the AAD App.	|
| `USE_AAD_AUTHORITY_URL`   | Authority URL (e.g. `https://login.windows.net/<tenantId>` |
| `USE_AAD_JWT_SECRET`      | Secret for signing auth cookies.  |

The authentication system is enabled for a site by setting the following
config in the site `json` config file.

```json
{
  "useAAD": true,
  "useAADRedirectUri": "http://yourdomain.com/token"
}
```

The redirect URI must match to one of those set in AAD or otherwise any
authentication attempt will fail.
