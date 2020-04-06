Functions
=========

The Functions feature allows Ship to, in addition to serving static assets, run
specially crafted JavaScript functions (files) on the server-side. Specially
crafted doesn't mean any black magic here, just that Functions can only load
a single JS file that exports a default function. This function file can be
either written manually or transpiled/compiled.

The Functions API follows the Node.js HTTP Server API. To be really exact,
what a function will see is [Micri](https://github.com/turist-cloud/micri) and
the function will be called like a Micri handler function.

The following is an example of a qualifying function.

```js
module.exports = (req, res) => {
	res.end('Hello world!');
}
```

This might at first seem like a limiting factor, but actually it's not as
limiting as one might think. It's possible to compile fairly complex
JavaScript or TypeScript project with its dependencies into a single `.js` file
exposing a single function. One popular tool for doing just this is called
[ncc](https://www.npmjs.com/package/@zeit/ncc). Ncc can compile a massive TS
project into a single `index.js` file and a bunch of `.d.ts` files for typing.
In our case, we are only interested in that `index.js`.

A working configuration with ncc for a TypeScript project could be something
like this.

**tsconfig.json**:

```json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "removeComments": true,
    "strict": true,
    "target": "ES2018",
    "inlineSourceMap": true
  }
}
```

and finally:

```
$ ncc build -m -s ./src/index.ts
```

This will create a file `dist/index.js` which can be then copied and rename as
`myfunc.fjs` into a domain folder. The function can be then requested over HTTP
like any URL. If the function file is called `index.fjs` then it will act like
it was an index of the folder.

See [examples](examples) for more usage examples.
