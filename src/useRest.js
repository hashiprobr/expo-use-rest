import { useState } from 'react';

import { Platform } from 'react-native';

export default function useRest(url, raw) {
    const [running, setRunning] = useState(false);

    async function request(method, uri, requestBody, files) {
        let responseBody;
        setRunning(true);
        try {
            const init = { method: method };
            if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
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
                    const string = JSON.stringify(requestBody);
                    if (Platform.OS === 'web') {
                        init.body.append('body', new Blob([string], { type: 'application/json' }));
                    } else {
                        init.body.append('body', { string: string, type: 'application/json' });
                    }
                } else {
                    init.headers = new Headers();
                    init.headers.append('Content-Type', 'application/json');
                    init.body = JSON.stringify(requestBody);
                }
            }
            let response;
            try {
                response = await fetch(`${url}${uri}`, init);
            } catch (error) {
                throw {
                    status: 0,
                    message: error.message,
                };
            }
            const status = response.status;
            const contentType = response.headers.get('Content-Type');
            if (raw) {
                responseBody = {
                    status: status,
                    contentType: contentType,
                    content: await response.text(),
                };
            } else {
                if (Math.trunc(status / 100) === 2) {
                    if (contentType && contentType.startsWith('application/json')) {
                        responseBody = await response.json();
                    } else {
                        responseBody = await response.text();
                    }
                } else {
                    const message = await response.text();
                    throw {
                        status: status,
                        message: message,
                    };
                }
            }
        } finally {
            setRunning(false);
        }
        return responseBody;
    }

    return {
        running,
        get: (uri) => request('GET', uri),
        post: (uri, requestBody, files) => request('POST', uri, requestBody, files),
        put: (uri, requestBody, files) => request('PUT', uri, requestBody, files),
        patch: (uri, requestBody, files) => request('PATCH', uri, requestBody, files),
        delete: (uri) => request('DELETE', uri),
    };
}
