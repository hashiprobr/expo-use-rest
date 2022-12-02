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
    return encodeURIComponent(decodeURIComponent(item));
}

function encodePath(uri) {
    const items = [];
    for (const item of uri.split('/')) {
        items.push(encode(item));
    }
    return items.join('/');
}

export default function useRest(url) {
    if (typeof url !== 'string') {
        throw new Error('Client URL must be a string');
    }
    url = url.trim();
    if (url.length === 0) {
        throw new Error('Client URL cannot be blank');
    }
    if (url.endsWith('/')) {
        throw new Error('Client URL cannot end with /');
    }

    const [running, setRunning] = useState(false);

    let count = 0;
    let mutex = Promise.resolve();

    async function request(method, uri, options, requestBody) {
        if (typeof uri !== 'string') {
            throw new Error('Request URI must be a string');
        }
        uri = uri.trim();
        if (uri.length === 0) {
            throw new Error('Request URI cannot be blank');
        }
        if (!uri.startsWith('/')) {
            throw new Error('Request URI must start with /');
        }
        let index = uri.indexOf('?');
        if (index === -1) {
            uri = encodePath(uri);
        } else {
            let prefix = uri.substring(0, index);
            let suffix = uri.substring(index + 1);
            uri = encodePath(prefix);
            const items = [];
            for (const item of suffix.split('&')) {
                index = item.indexOf('=');
                if (index === -1) {
                    items.push(encode(item));
                } else {
                    prefix = item.substring(0, index);
                    suffix = item.substring(index + 1);
                    items.push(`${encode(prefix)}=${encode(suffix)}`);
                }
            }
            if (items.length > 0) {
                uri = `${uri}?${items.join('&')}`;
            }
        }
        const init = {
            method: method,
            headers: new Headers(),
        };
        const headers = clean(options.headers, 'headers');
        for (const [name, value] of Object.entries(headers)) {
            init.headers.append(name, value);
        }
        if (typeof requestBody !== 'undefined') {
            if (typeof options.type === 'undefined' || options.type === null) {
                options.type = '';
            } else {
                if (typeof options.type !== 'string') {
                    throw new Error('Request type must be a string');
                }
                const index = options.type.indexOf(';');
                if (index !== -1) {
                    options.type = options.type.slice(0, index);
                }
                options.type = options.type.trim();
            }
            if (options.type) {
                if (options.type.startsWith('multipart/form-data')) {
                    init.body = new FormData();
                    requestBody = clean(requestBody, 'body');
                    for (const name in requestBody) {
                        const part = clean(requestBody[name], 'part');
                        if (typeof part.type === 'undefined' || part.type === null) {
                            part.type = '';
                        } else {
                            if (typeof part.type !== 'string') {
                                throw new Error('Request part type must be a string');
                            }
                            const index = part.type.indexOf(';');
                            if (index !== -1) {
                                part.type = part.type.slice(0, index);
                            }
                            part.type = part.type.trim();
                        }
                        if (typeof part.content !== 'undefined') {
                            if (part.type) {
                                if (part.type.startsWith('application/json')) {
                                    part.content = JSON.stringify(part.content);
                                } else {
                                    if (typeof part.content !== 'string') {
                                        throw new Error('Request part content must be a string');
                                    }
                                }
                            } else {
                                if (typeof part.content === 'string') {
                                    part.type = 'text/plain; charset=utf-8';
                                } else {
                                    part.type = 'application/json; charset=utf-8';
                                    part.content = JSON.stringify(part.content);
                                }
                            }
                            if (Platform.OS === 'web') {
                                init.body.append(name, new Blob([part.content], { type: part.type }));
                            } else {
                                init.body.append(name, { string: part.content, type: part.type });
                            }
                        } else if (typeof part.uri !== 'undefined') {
                            if (typeof part.uri !== 'string') {
                                throw new Error('Request part uri must be a string');
                            }
                            if (Platform.OS === 'web') {
                                if (part.uri.startsWith('data:')) {
                                    const index = part.uri.indexOf(',');
                                    if (index === -1) {
                                        throw new Error('Data URI must have a comma');
                                    }
                                    const requestType = part.uri.slice(5, index).trim();
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
                            throw new Error('Request part must have either a content or an uri');
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
                    init.headers.append('Content-Type', 'text/plain; charset=utf-8');
                    init.body = requestBody;
                } else {
                    init.headers.append('Content-Type', 'application/json; charset=utf-8');
                    init.body = JSON.stringify(requestBody);
                }
            }
        }
        let responseBody;
        mutex = mutex.then(() => {
            if (count === 0) {
                setRunning(true);
            }
            count++;
        });
        try {
            let response;
            try {
                response = await fetch(`${url}${uri}`, init);
            } catch (error) {
                if (options.full) {
                    throw {
                        status: 0,
                        contentType: 'text/plain; charset=utf-8',
                        content: error.message,
                    };
                } else {
                    throw error.message;
                }
            }
            const status = response.status;
            const responseType = response.headers.get('Content-Type');
            if (options.raw) {
                responseBody = response.body;
            } else {
                if (responseType && responseType.startsWith('application/json')) {
                    responseBody = await response.json();
                } else {
                    responseBody = await response.text();
                }
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

    function requestWithoutBody(method, uri, options) {
        options = clean(options, 'options');
        if ('body' in options) {
            const requestBody = options.body;
            delete options.body;
            return request(method, uri, options, requestBody);
        }
        return request(method, uri, options);
    }

    function requestWithBody(method, uri, options, requestBody) {
        options = clean(options, 'options');
        return request(method, uri, options, requestBody);
    }

    return {
        running,
        get: (uri, options) => requestWithoutBody('GET', uri, options),
        post: (uri, body, options) => requestWithBody('POST', uri, options, body),
        put: (uri, body, options) => requestWithBody('PUT', uri, options, body),
        patch: (uri, body, options) => requestWithBody('PATCH', uri, options, body),
        delete: (uri, options) => requestWithoutBody('DELETE', uri, options),
    };
}
