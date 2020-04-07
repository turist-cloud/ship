Turist Ship
===========

Ship websites like it's the 90's again! FTP FTW

- No enforced version control integration
- No build steps
- No previews
- Just File Transfer Protocols!

**Documentation**

- [Deploying](/docs/deploying.md)
- [Configuration](/docs/config.md)
- [Functions](/docs/functions.md)


**Ship It**

Upload files:

![Ship](/docs/ship.gif)


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

