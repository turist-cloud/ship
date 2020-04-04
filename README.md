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


And you are ready to ship 🎉

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

Using Azure App Services and CloudFlare
---------------------------------------

1. Create an App Service and configure deploys with e.g. GitHub
   (You can just use the Wizard and look how the GitHub action is implemented
    in this repository)
2. Point your domain's `NS` records to CloudFlare
3. Set the following DNS records in CloudFlare:
    - `A` `@` -> `<Your App's IP as shown in Azure e.g. in Custom domains>`
    - `CNAME` -> `@`
4. Go to *Custom domains* tab in your Azure App Service
    1. Click *Add custom domain* and type in the apex domain
    2. At this point the verification may fail and Azure might ask you to add
       a `TXT` record and tell you that the `A` record is incorrect
5. Go back to Cloudflare
    1. Click the cloud symbol on the `A` record to make it point
       directly to Azure (you may revert this later)
    2. Add the `TXT` record as instructed in Azure
6. Retry adding the domain in Azure
 (and then revert back the CloudFlare proxy setting)
7. Create an origin cert in CloudFlare
    1. Goto the *SSL/TLS* tab
    2. Select *Full (strict)* encryption mode
    1. Goto the *Origin* sub-tab
    2. Click *Create Certificate*, use the defaults, and just copy & paste the
       two files
    3. As Azure needs the certificate in a different format, run the following
       in a terminal (the password can be anything and you'll only need it once):
	   `openssl pkcs12 -export -out domain.pfx -inkey domain.key -in domain.crt`
8. In Azure, go to *TLS/SSL settings* -> *Private Key Certificates*
    1. Click *Upload Certificate*, select the file, and provide the previously set
       password
    2. Go to *Custom domains* and add the *SSL Binding*
    3. At this point you may want to turn	on the *HTTPS Only* knob

Rinse and repeat. You can add as many domains as you want and the domains will
be served from the respective folders in your OneDrive or SPO Document Library.

To make `wwww` work you may either add it as a separate domain in Azure App
Services or you can make a forwarding rule in CloudFlare. The first way
allows you to serve different files for the subdomain, while the latter
just redirects to the apex domain. Here is how you can add the forwarding
in CloudFlare.

1. Go to *Page Rules*
2. Click *Add Page Rule*
3. Type this to the first input box: `www.mycooldomain.com/*`
4. Select *Forwarding URL* from the dropdown menu
5. Select `301` from the next menu
6. Type this to the last input box: `https://mycooldomain.com/$1`
7. Deploy and save
