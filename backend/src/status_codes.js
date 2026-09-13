export const STATUS_CODES = {
    ERROR: {
        // Server
        SERVER_INTERNAL_ERROR: 500,

        // Web
        WEB_BAD_REQUEST: 400,
        WEB_UNAUTHORIZED: 401,
        WEB_FORBIDDEN: 403,
        WEB_NOT_FOUND: 404,
        WEB_CONFLICT: 409,
        WEB_PAYLOAD_TOO_LARGE: 413,
        WEB_UNSUPPORTED_MEDIA_TYPE: 415,
        WEB_TOO_MANY_REQUESTS: 429,
    },

    INFO: {
        // Web
        WEB_OK: 200,
        WEB_CREATED: 201,
        WEB_NO_CONTENT: 204,
    }
};