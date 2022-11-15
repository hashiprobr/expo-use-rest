react-native-use-rest
=====================

**A React Native Hook for simplifying requests to REST servers**

This hook receives an `url` and returns an object with six properties:

* a boolean state `running`, that indicates whether it is waiting for a request;

* an asynchronous method `get(uri[, options])`, that sends a GET to `url+uri`
  and returns its response;

* an asynchronous method `post(uri, body[, options])`, that sends a POST to
  `url+uri` and returns its response;

* an asynchronous method `put(uri, body[, options])`, that sends a PUT to
  `url+uri` and returns its response;

* an asynchronous method `patch(uri, body[, options])`, that sends a PATCH to
  `url+uri` and returns its response;

* an asynchronous method `delete(uri[, options])`, that sends a DELETE to
  `url+uri` and returns its response.

The optional parameter `options` is an object that can have X attributes:

* an object `headers`, that has headers you want to add to the request;

* a string `type`, that indicates the type of the request body (only applies to
  POST, PUT, and PATCH);

* a boolean `full`, that indicates whether the response should be only the
  content or an object with the `status`, the `contentType`, and the `content`.


Request
-------

If `body` is `undefined`, the request has no content.

If `type` is `undefined`, the `body` is sent unchanged as `text/plain` if it is
a string and sent serialized as `application/json` otherwise.

If `type` is defined, the `body` is sent serialized if it is `application/json`
and sent unchanged otherwise. In the latter case, should be a string.

In the particular case that `type` is `multipart/form-data`, the `body` should
be an object where each attribute represents a field. The attribute name is
the field name and the value is an object with two attributes:

* a string `content`, that represents the content of the field;

* a string `uri`, that represents the source of the content (if `content` is
  defined, this attribute is ignored);

* an optional string `type`, that indicates the type of the field.

If `content` is defined, the same serialization rules apply.


Response
--------

If the status code is 4XX, 5XX, or 0 (a special value indicating that the
request could not even be sent), the response is thrown instead of returned.

If the content type is `application/json`, the content is unserialized and
received as whatever it representes. Otherwise, it is received unchanged as a
string.


Peer dependencies
-----------------

``` json
{
    "react": "17.0.2",
    "react-native": "0.68.2"
}
```


Install
-------

With npm:

```
npm install @hashiprobr/react-native-use-rest
```

With yarn:

```
yarn add @hashiprobr/react-native-use-rest
```


Example
-------

``` js
import React from 'react';

import { View, Text, Button } from 'react-native';

import useRest from '@hashiprobr/react-native-use-rest';

export default function MyComponent() {
    const client = useRest('http://address.of.a.host:8080');

    async function onPress() {
        let body;
        try {
            body = await client.get('/uri/to/an/endpoint');
        } catch (error) {
            console.error(error);
        }
        if (body) {
            console.log(body);
        }
    }

    return (
        <View
            style={{
                flexGrow: 1,
                justifyContent: 'center',
                alignItems: 'center',
            }}
        >
            {client.running ? (
                <Text>running...</Text>
            ) : (
                <Button title="run" onPress={onPress} />
            )}
        </View>
    );
}
```
