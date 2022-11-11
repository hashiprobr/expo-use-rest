import { useState } from 'react';

import { Platform } from 'react-native';

function clean(object) {
    if (typeof object !== 'object' || object === null) {
        return {};
    }
    return object;
}

export default function useRest(url) {
    const [running, setRunning] = useState(false);

    let count = 0;
    let mutex = Promise.resolve();

    async function request(method, uri, options) {
        let responseBody;
        mutex = mutex.then(() => {
            if (count === 0) {
                setRunning(true);
            }
            count++;
        });
        try {
            if (typeof uri !== 'string') {
                throw new Error('Request URI must be a string');
            }
            options = clean(options);
            const init = {
                method: method,
                headers: new Headers(),
            };
            for (const [name, value] of Object.entries(clean(options.headers))) {
                init.headers.append(name, value);
            }
            if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
                const files = clean(options.files);
                if (files) {
                    init.body = new FormData();
                    for (const [key, value] of Object.entries(files)) {
                        if (Platform.OS === 'web') {
                            if (value.startsWith('data:')) {
                                const index = value.indexOf(',');
                                const type = value.slice(5, index);
                                const string = value.slice(index + 1);
                                if (type) {
                                    init.body.append(key, new Blob([string], { type: type }));
                                } else {
                                    init.body.append(key, new Blob([string]));
                                }
                            } else {
                                throw new Error('Multipart in the web only supports data URIs');
                            }
                        } else {
                            if (value.startsWith('data:')) {
                                throw new Error('Multipart in device does not support data URIs');
                            } else {
                                if (Platform.OS === 'android') {
                                    init.body.append(key, { uri: value, type: 'application/octet-stream' });
                                } else {
                                    init.body.append(key, { uri: value });
                                }
                            }
                        }
                    }
                    const string = JSON.stringify(options.body);
                    if (Platform.OS === 'web') {
                        init.body.append('body', new Blob([string], { type: 'application/json' }));
                    } else {
                        init.body.append('body', { string: string, type: 'application/json' });
                    }
                } else {
                    init.headers.append('Content-Type', 'application/json');
                    init.body = JSON.stringify(options.body);
                }
            }
            let response;
            try {
                response = await fetch(`${url}${uri}`, init);
            } catch (error) {
                throw {
                    status: 0,
                    contentType: 'text/plain',
                    content: error.message,
                };
            }
            const status = response.status;
            const contentType = response.headers.get('Content-Type');
            if (contentType && contentType.startsWith('application/json')) {
                responseBody = await response.json();
            } else {
                responseBody = await response.text();
            }
            if (Math.trunc(status / 100) > 3) {
                throw {
                    status: status,
                    contentType: contentType,
                    content: responseBody,
                };
            }
            if (options.complete) {
                responseBody = {
                    status: status,
                    contentType: contentType,
                    content: responseBody,
                };
            }
        } finally {
            mutex = mutex.then(() => {
                count--;
                if (count === 0) {
                    setRunning(false);
                }
            });
        }
        return responseBody;
    }

    return {
        running,
        get: (uri, options) => request('GET', uri, options),
        post: (uri, body, options) => request('POST', uri, { ...options, body }),
        put: (uri, body, options) => request('PUT', uri, { ...options, body }),
        patch: (uri, body, options) => request('PATCH', uri, { ...options, body }),
        delete: (uri, options) => request('DELETE', uri, options),
    };
}
