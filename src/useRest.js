import { useState } from 'react';

import { Platform } from 'react-native';

function clean(object, name) {
    if (typeof object === 'undefined' || object === null) {
        return {};
    }
    if (typeof object !== 'object') {
        throw new Error(`Request ${name} must be an object`);
    }
    return object;
}

function encode(item) {
    return encodeURIComponent(decodeURIComponent(item.trim()).trim());
}

function encodePath(uri) {
    const args = [];
    for (const item of uri.split('/')) {
        const arg = encode(item);
        if (arg.length > 0) {
            args.push(arg);
        }
    }
    return `/${args.join('/')}`;
}

export default function useRest(url) {
    const [running, setRunning] = useState(false);

    let count = 0;
    let mutex = Promise.resolve();

    async function request(method, uri, options, requestBody) {
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
            let index = uri.indexOf('?');
            if (index === -1) {
                uri = encodePath(uri);
            } else {
                const prefix = uri.substring(0, index);
                const suffix = uri.substring(index + 1);
                const args = [];
                for (const item of suffix.split('&')) {
                    index = item.indexOf('=');
                    if (index === -1) {
                        const arg = encode(item);
                        if (arg.length > 0) {
                            args.push(arg);
                        }
                    } else {
                        const name = item.substring(0, index);
                        const value = item.substring(index + 1);
                        args.push(`${encode(name)}=${encode(value)}`);
                    }
                }
                uri = encodePath(prefix);
                if (args.length > 0) {
                    uri = `${uri}?${args.join('&')}`;
                }
            }
            options = clean(options, 'options');
            const init = {
                method: method,
                headers: new Headers(),
            };
            const headers = clean(options.headers, 'headers');
            for (const [name, value] of Object.entries(headers)) {
                init.headers.append(name, value);
            }
            if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
                if (options.type) {
                    if (typeof options.type !== 'string') {
                        throw new Error('Request type must be a string');
                    }
                    if (options.type.startsWith('multipart/form-data')) {
                        init.body = new FormData();
                        requestBody = clean(requestBody, 'body');
                        for (const name in requestBody) {
                            const part = clean(requestBody[name], 'part');
                            if (part.type && typeof part.type !== 'string') {
                                throw new Error('Request part type must be a string');
                            }
                            if (part.string) {
                                if (typeof part.string !== 'string') {
                                    throw new Error('Request part string must be a string');
                                }
                                if (Platform.OS === 'web') {
                                    if (part.type) {
                                        init.body.append(name, new Blob([part.string], { type: part.type }));
                                    } else {
                                        init.body.append(name, new Blob([part.string]));
                                    }
                                } else {
                                    if (part.type) {
                                        init.body.append(name, { string: part.string, type: part.type });
                                    } else {
                                        init.body.append(name, { string: part.string });
                                    }
                                }
                            } else if (part.uri) {
                                if (typeof part.uri !== 'string') {
                                    throw new Error('Request part uri must be a string');
                                }
                                if (Platform.OS === 'web') {
                                    if (part.uri.startsWith('data:')) {
                                        const index = part.uri.indexOf(',');
                                        const requestType = part.uri.slice(5, index);
                                        const string = part.uri.slice(index + 1);
                                        if (requestType) {
                                            init.body.append(name, new Blob([string], { type: requestType }));
                                        } else {
                                            if (part.type) {
                                                init.body.append(name, new Blob([string], { type: part.type }));
                                            } else {
                                                init.body.append(name, new Blob([string]));
                                            }
                                        }
                                    } else {
                                        throw new Error('Multipart in the web only supports data URIs');
                                    }
                                } else {
                                    if (part.uri.startsWith('data:')) {
                                        throw new Error('Multipart in device does not support data URIs');
                                    } else {
                                        if (part.type) {
                                            init.body.append(name, { uri: part.uri, type: part.type });
                                        } else {
                                            if (Platform.OS === 'android') {
                                                init.body.append(name, { uri: part.uri, type: 'application/octet-stream' });
                                            } else {
                                                init.body.append(name, { uri: part.uri });
                                            }
                                        }
                                    }
                                }
                            } else {
                                throw new Error('Request part must have either a string or an uri');
                            }
                        }
                    } else {
                        init.headers.append('Content-Type', options.type);
                        if (options.type.startsWith('application/json')) {
                            init.body = JSON.stringify(requestBody);
                        } else {
                            if (typeof requestBody !== 'string') {
                                throw new Error('Request body must be a string');
                            }
                            init.body = requestBody;
                        }
                    }
                } else {
                    if (typeof requestBody === 'string') {
                        init.headers.append('Content-Type', 'text/plain');
                        init.body = requestBody;
                    } else {
                        init.headers.append('Content-Type', 'application/json');
                        init.body = JSON.stringify(requestBody);
                    }
                }
            }
            let response;
            try {
                response = await fetch(`${url}${uri}`, init);
            } catch (error) {
                if (options.full) {
                    throw {
                        status: 0,
                        contentType: 'text/plain',
                        content: error.message,
                    };
                } else {
                    throw error.message;
                }
            }
            const status = response.status;
            const responseType = response.headers.get('Content-Type');
            if (responseType && responseType.startsWith('application/json')) {
                responseBody = await response.json();
            } else {
                responseBody = await response.text();
            }
            if (options.full) {
                responseBody = {
                    status: status,
                    contentType: responseType,
                    content: responseBody,
                };
            }
            if (Math.trunc(status / 100) > 3) {
                throw responseBody;
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
        post: (uri, body, options) => request('POST', uri, options, body),
        put: (uri, body, options) => request('PUT', uri, options, body),
        patch: (uri, body, options) => request('PATCH', uri, options, body),
        delete: (uri, options) => request('DELETE', uri, options),
    };
}
