badgehost
=========

[Badge assertions][assertions] can be trickier than you'd think to set up for testing.
v0.5 badges can be hosted statically without too much trouble, but
v1.0 badges need at least 3 separate files pointing to each other with
fully qualified URLs.

`badgehost` is a utility to help simplify hosting a variety of assertions.

[assertions]: https://github.com/mozilla/openbadges/wiki/Assertions

[![Build Status](https://travis-ci.org/stenington/badgehost.png)](https://travis-ci.org/stenington/badgehost)

## Quick Start

```
git clone https://github.com/stenington/badgehost.git
cd badgehost
npm install
npm test
node bin/server.js
```

By default `badgehost` runs on port 8888, hosts the static files in `static/`,
and the assertions in `assertions/`.

Visit http://localhost:8888/demo.json, for example, to see that assertion; or visit
http://localhost:8888/ for a simple helper page.

### Environment Variables

* `PORT` is the port that the server binds to. Defaults to 8888.
* `STATIC_DIR` is the directory holding your static files. Defaults to `./static`.
* `ASSERTION_DIR` is the directory holding your assertion files. Defaults to `./assertions`.

## Template variables 

`badgehost` provides a set of templating variables you can use in your assertion
files. Templating is handled with [nunjucks], so most Jinja2 syntax is valid:

* `origin`: protocol, host, and port only matching the request URL
* `host`: protocol, host, port and mount point, if any, matching the request URL
* `static`: host + path of static directory (currently same as host)
* `assertions`: host + path of assertions route (currently same as host)
* `self`: full URL of json object being rendered
* `signed`: boolean indicating if the assertion should be signed
* `publicKey`: full URL of the public key for signed assertions

Use them in your assertion files with `{{ variable }}`.

[nunjucks]: http://nunjucks.jlongster.com/templating

## Routes

`badgehost` provides three routes for accessing your assertions.

* `/file.json` will serve `file` from your assertions directory
* `/0.5/file.json` will only serve 0.5 assertions *(upgrade to 1.0 forthcoming)*
* `/1.0/file.json` will only serve 1.0 assertions *(downgrade to 0.5 forthcoming)*

## Parameters

Static fixtures can reach their limits quickly when testing a lot of variations. It
can read better as well to specify details of the testing data with the tests. To
that end `badgehost` provides the following parameters to modify assertions:

*`{...}` below represents a URL encoded, stringified object, which can contain
nested objects.*

* `?set={...}` copies the specified properties into the assertion, overriding existing values.
* `?merge={..}` copies the specified properties into the assertion, recursing into nested objects.
* `?deep=1` effectively lets the merge work across linked 1.0 objects. Objects specified in the 
  `merge` parameter where the assertion has a string will get appended as `?deep=1&merge={...}`.
* `?sign=1` will present you with a copy-and-pastable signature built from the specified assertion

## Module

`badgehost` can also be included as a module in a project.

### Example

``` javascript
var app = require('badgehost').app.build();
app.listen(function() {
  console.log('Now you can access your assertions at ' + app.url());
});
```

### Methods

`badgehost.app.build(options)` creates a badgehost [express][] app. `options`
can include the following keys:

* `assertionDir` is the directory holding your assertion files, if you want
  to override the defaults provided by the module.
* `staticDir` is the directory holding your static files, if you want
  to override the defaults provided by the module.

The express app has the following additional methods:

`app.url(file, queryOpts)` is a helper that builds a full URL path from

* `file`: assertion file, e.g. `file.json`
* `queryOpts`: 
    * `set`: object with properties to set on assertion
    * `merge`: object with properties to merge with assertion
    * `deep`: set to `true` for deep merging

It's assumed that `app.url()` has been preceded by a successful call to
`app.listen()`, since otherwise there is no way to know what port the 
app is at.

If you need to get the host-relative path to a particular file, you can use
`app.path()`, which takes the same parameters as `app.url()`.

  [express]: http://expressjs.com/
