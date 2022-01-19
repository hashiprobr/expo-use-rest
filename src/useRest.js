import { useState } from 'react';

import { Platform } from 'react-native';

import * as FileSystem from 'expo-file-system';

export default function useRest(url) {
    const [running, setRunning] = useState(false);

    async function read(uri, init) {
        let responseBody;
        let response;
        try {
            response = await fetch(`${url}${uri}`, init);
        } catch (error) {
            throw {
                status: 0,
                message: error,
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
        return responseBody;
    }

    async function request(method, uri, requestBody) {
        let responseBody;
        setRunning(true);
        try {
            const init = { method: method };
            if (method === 'POST' || method === 'PUT') {
                init.headers = new Headers();
                if (typeof requestBody === 'string') {
                    init.headers.append('Content-Type', 'text/plain; charset=UTF-8');
                    init.body = requestBody;
                } else {
                    init.headers.append('Content-Type', 'application/json; charset=UTF-8');
                    init.body = JSON.stringify(requestBody);
                }
            }
            responseBody = await read(uri, init);
        } finally {
            setRunning(false);
        }
        return responseBody;
    }

    async function upload(method, uri, file) {
        let responseBody;
        setRunning(true);
        try {
            if (Platform.OS === 'web') {
                if (file.startsWith('data:')) {
                    const init = { method: method };
                    const data = file.slice(file.indexOf(',') + 1);
                    init.body = Buffer.from(data, 'base64');
                    responseBody = await read(uri, init);
                } else {
                    throw new Error('Upload in the web only supports data URIs');
                }
            } else {
                const options = { httpMethod: method };
                let response;
                try {
                    response = await FileSystem.uploadAsync(`${url}${uri}`, file, options);
                } catch (error) {
                    throw {
                        status: 0,
                        message: error,
                    };
                }
                const status = response.status;
                const type = response.headers['Content-Type'];
                if (status === 200) {
                    if (type.startsWith('application/json')) {
                        responseBody = JSON.parse(response.body);
                    } else {
                        responseBody = response.body;
                    }
                } else {
                    const message = response.body;
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
        post: (uri, requestBody) => request('POST', uri, requestBody),
        put: (uri, requestBody) => request('PUT', uri, requestBody),
        delete: (uri) => request('DELETE', uri),
        uploadPost: (uri, file) => upload('POST', uri, file),
        uploadPut: (uri, file) => upload('PUT', uri, file),
    };
}
