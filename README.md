react-native-use-rest
=====================

**A React Native Hook for simplifying requests to REST servers**

This hook receives an `url` and returns an object with seven properties:

* a boolean state `running`, that indicates whether it is waiting for a request
  or upload;

* an asynchronous method `get(uri)`, that sends a GET to `url+uri` and returns
  its response;

* an asynchronous method `post(uri, body)`, that sends a POST to `url+uri` and
  returns its response (see below for details);

* an asynchronous method `put(uri, body)`, that sends a PUT to `url+uri` and
  returns its response (see below for details);

* an asynchronous method `delete(uri)`, that sends a DELETE to `url+uri` and
  returns its response;

* an asynchronous method `uploadPost(restUri, fileUri)`, that sends a POST to
  `url+restUri` and returns its response (see below for details);

* an asynchronous method `uploadPut(restUri, fileUri)`, that sends a PUT to
  `url+restUri` and returns its response (see below for details).

In `post` and `put`, if the request `body` is a string, it is sent unchanged as
`text/plain`. Otherwise, it is serialized and sent as `application/json`.

In `uploadPost` and `uploadPut`, the bytes of the file located at `fileUri` are
sent with
[FileSystem.uploadAsync](https://docs.expo.dev/versions/latest/sdk/filesystem/#filesystemuploadasyncurl-fileuri-options).

If the response body is `application/json`, it is unserialized and received as
whatever it represents. Otherwise, it is received unchanged as a string.

If the response status is not 200, throws an error with properties `status` and
`message`. The status is 0 if the request could not even be made.


Peer dependencies
-----------------

``` json
{
    "expo": "^43.0.5",
    "expo-file-system": "^13.0.3",
    "react": "^17.0.1",
    "react-native": ">=0.64.3"
}
```


Install
-------

With npm:

```
npm install @hashiprobr/expo-use-rest
```

With yarn:

```
yarn add @hashiprobr/expo-use-rest
```

With expo:

```
expo install @hashiprobr/expo-use-rest
```


Example
-------

``` js
import React from 'react';

import { View, Text, Button } from 'react-native';

import useRest from '@hashiprobr/expo-use-rest';

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
