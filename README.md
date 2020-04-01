Turist Ship
===========

Ship websites like it's the 90's again! FTP FTW

- No enforced version control integration
- No build steps
- No previews
- Just File Transfer Protocols!


Ship It
-------

**Create a new app in Azure AD**

- Platform configuration: Background process and Automation
- Create a client secret and copy its value into a safe place
- Setup API permissions
  - `Files.Read.All`
  - Remove everything else

![AAD Permissions](/aad-perms.png)

**Create a directory in OneDrive or SharePoint Online**

Create a new directory for serving files in
[OneDrive](https://docs.microsoft.com/en-us/graph/api/resources/onedrive?view=graph-rest-beta)
or a SharePoint Online
[site](https://docs.microsoft.com/en-us/graph/api/resources/sharepoint?view=graph-rest-beta#sharepoint-api-root-resources).
The directory can be located anywhere as long as you can figure out how
to point it in Microsoft Graph API.

By default Ship will look for directories named by domains under this
directory and serve the files from there. Anything looking like `index.*` will be
served like an index.

**Ship the code**

Install the server:

```
$ yarn install
```

Create a run script or set environment variables in whichever way you prefer.
In this repository we used Azure Apps Service for fast and easy deploy, but
there is nothing stopping you from running this on your Raspberry Pi.

Here is an example what a startup script could look like.

*run.sh*:

```bash
#!/bin/bash

ROOT='/sites/root/drive/root:/ship-demo' \
	TENANT_ID='xxxxx' \
	CLIENT_ID='xxxxx' \
	CLIENT_SECRET='verysecret' \
	yarn start
```

`ROOT` is a path to a OneDrive folder or a SharePoint Online site drive folder.
The example uses the default Document Library and a folder called `ship-demo`
under it. All your websites will be server from here based on `Host`. So for
example if you are running locally then `http://localhost:3000` is served from
`/ship-demo/localhost`.

`TENANT_ID` and `CLIENT_ID` is given on the AAD App registration Overview tab.
`CLIENT_SECRET` was created and shown once on the Certificates & secrets tab.

Start it (probably not manually?):

```
$ ./run.sh
```

Upload the files for your first website:

![Ship](/ship.gif)


And you are ready 🎉

```
$ ./run.sh
yarn run v1.22.4
$ node lib/
Authenticated
::ffff:127.0.0.1 - - [31/Mar/2020:20:54:01 +0200] "GET / HTTP/1.1" 200 2956 "-" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36"
::ffff:127.0.0.1 - - [31/Mar/2020:20:54:02 +0200] "GET /_next/static/JHDZ9NRlatJ_ayvFY4ARj/pages/index.js HTTP/1.1" 200 - "http://localhost:3000/" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36"
::ffff:127.0.0.1 - - [31/Mar/2020:20:54:02 +0200] "GET /_next/static/chunks/2144245e37f33e62ff0769118596f5336006ab37.690418c523b6381dd666.js HTTP/1.1" 200 - "http://localhost:3000/" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36"
::ffff:127.0.0.1 - - [31/Mar/2020:20:54:02 +0200] "GET /_next/static/runtime/webpack-b65cab0b00afd201cbda.js HTTP/1.1" 200 - "http://localhost:3000/" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36"
::ffff:127.0.0.1 - - [31/Mar/2020:20:54:02 +0200] "GET /_next/static/runtime/main-b2ed23686b259ba374f7.js HTTP/1.1" 200 - "http://localhost:3000/" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36"
::ffff:127.0.0.1 - - [31/Mar/2020:20:54:03 +0200] "GET /_next/static/JHDZ9NRlatJ_ayvFY4ARj/pages/_app.js HTTP/1.1" 200 - "http://localhost:3000/" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36"
::ffff:127.0.0.1 - - [31/Mar/2020:20:54:03 +0200] "GET /_next/static/chunks/framework.c8966c7d8b377309e6b8.js HTTP/1.1" 200 - "http://localhost:3000/" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36"
```
