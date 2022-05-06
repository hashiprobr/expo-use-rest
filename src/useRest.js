import { useState } from 'react';

import { Platform } from 'react-native';

import * as FileSystem from 'expo-file-system';

export default function useRest(url) {
    const [running, setRunning] = useState(false);

    async function request(method, uri, requestBody, files) {
        let responseBody;
        setRunning(true);
        try {
            const init = { method: method };
            if (method === 'POST' || method === 'PUT') {
                if (files) {
                    init.body = new FormData();
                    for (const [key, value] of Object.entries(files)) {
                        let content;
                        if (Platform.OS === 'web') {
                            if (value.startsWith('data:')) {
                                content = value.slice(value.indexOf(',') + 1);
                            } else {
                                throw new Error('Multipart in the web only supports data URIs');
                            }
                        } else {
                            content = await FileSystem.readAsStringAsync(value, { encoding: FileSystem.EncodingType.Base64 });
                        }
                        init.body.append(key, new Blob([content], { type: 'application/octet-stream;base64' }));
                    }
                    init.body.append('body', new Blob([JSON.stringify(requestBody)], { type: 'application/json' }));
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
            const type = response.headers.get('Content-Type');
            if (status === 200) {
                if (type.startsWith('application/json')) {
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
        delete: (uri) => request('DELETE', uri),
    };
}
