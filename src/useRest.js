import { useState } from 'react';

import * as FileSystem from 'expo-file-system';

export default function useRest(url) {
    const [running, setRunning] = useState(false);

    async function request(method, uri, requestBody) {
        let responseBody;
        setRunning(true);
        try {
            const init = { method: method };
            if (method === 'POST' || method === 'PUT') {
                init.headers = new Headers();
                if (typeof requestBody === 'string') {
                    init.headers.append('Content-Type', 'text/plain');
                    init.body = requestBody;
                } else {
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
                    message: error,
                };
            }
            const type = response.headers.get('Content-Type');
            if (response.status === 200) {
                if (type.startsWith('application/json')) {
                    responseBody = await response.json();
                } else {
                    responseBody = await response.text();
                }
            } else {
                let message = await response.text();
                if (type.startsWith('text/html')) {
                    const parser = new DOMParser();
                    const document = parser.parseFromString(message, 'text/html');
                    message = document.body.innerText.trim();
                }
                throw {
                    status: response.status,
                    message: message,
                };
            }
        } finally {
            setRunning(false);
        }
        return responseBody;
    }

    async function upload(method, uri, file) {
        let responseBody;
        setRunning(true);
        try {
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
            const type = response.headers['Content-Type'];
            if (response.status === 200) {
                if (type.startsWith('application/json')) {
                    responseBody = JSON.parse(response.body);
                } else {
                    responseBody = response.body;
                }
            } else {
                let message = response.body;
                if (type.startsWith('text/html')) {
                    const parser = new DOMParser();
                    const document = parser.parseFromString(message, 'text/html');
                    message = document.body.innerText.trim();
                }
                throw {
                    status: response.status,
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
        post: (uri, requestBody) => request('POST', uri, requestBody),
        put: (uri, requestBody) => request('PUT', uri, requestBody),
        delete: (uri) => request('DELETE', uri),
        uploadPost: (uri, file) => upload('POST', uri, file),
        uploadPut: (uri, file) => upload('PUT', uri, file),
    };
}
