# Change Log

**v0.1.1**
Updated dependencies and Travis CI checks

**v0.1.0**
Updated dependencies and accepted PR #5

**v0.0.9**
Updated dependencies and added badges 

**v0.0.8**
Support gzip requests. [Thx, @LynxyssCZ](https://github.com/wilson428/downcache/issues/1)!

**v0.0.7**
Support POST requests

**v0.0.6a**
Cleaned up tests and fixed the damn markdown list.

**v0.0.6**
Rate limiting implemented. Can now set "global" options for all downcache calls in a session.

**v0.0.5b**
Try out rate limiting 

**v0.0.5a**
Does not cache responses that have a status code other than 200.

**v0.0.4**
Checks to see if cached version is empty, and calls live if so.

**v0.0.3**
+Changed order of arguments passed to callback from `(err, body, resp)` to `(err, resp, body)` to match the [request module](https://github.com/mikeal/request).