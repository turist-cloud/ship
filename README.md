Turist Ship
===========

Ship websites like it's the 90's again! FTP FTW

- NO
  - enforced version control integration
  - build steps
  - previews
- Just File Transfer Protocols!
- Built-in TLS and HTTP/2 support
- Static HTTP/2 Server Push with CloudFlare
- Compatible with [Next.js](https://nextjs.org/) serverless target [READ MORE](/docs/examples/next.js-demo)
- Optional Azure AD authentication for websites [READ MORE](/docs/use-add.md)

Documentation
-------------

- [Deploying](/docs/deploying.md)
- [Configuration](/docs/config.md)
- [TLS and HTTP/2](/docs/tls.md)
- [Functions](/docs/functions.md)
- [Azure AD Authentication](/docs/use-add.md)


Ship It
-------

You can either upload files manually to SharePoint Online or use
[ship-board](/packages/ship-board).

**Uploading files manually**

![Ship](/docs/ship.gif)

**Using ship-board**

<a href="http://www.youtube.com/watch?feature=player_embedded&v=bTkfUmCDJg0" target="_blank">
<img src="http://img.youtube.com/vi/bTkfUmCDJg0/0.jpg" alt="ship-board video" width="240" height="180" border="10" />
</a>

And that's it, you have already shipped a new website  🎉

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

