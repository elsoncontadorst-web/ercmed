/**
 * Secure Logger Utility
 * Only logs in development mode to prevent data exposure in production
 */

const isDevelopment = import.meta.env.DEV;

export const logger = {
    /**
     * Log general information (development only)
     */
    log: (...args: any[]) => {
        if (isDevelopment) {
            console.log(...args);
        }
    },

    /**
     * Log errors (always logged for monitoring)
     */
    error: (...args: any[]) => {
        console.error(...args);
    },

    /**
     * Log warnings (development only)
     */
    warn: (...args: any[]) => {
        if (isDevelopment) {
            console.warn(...args);
        }
    },

    /**
     * Log debug information (development only)
     */
    debug: (...args: any[]) => {
        if (isDevelopment) {
            console.debug(...args);
        }
    },

    /**
     * Log sensitive data (NEVER in production)
     * Use sparingly and only for critical debugging
     */
    sensitive: (label: string, data: any) => {
        if (isDevelopment) {
            console.log(`[SENSITIVE] ${label}:`, data);
        }
    }
};

export default logger;
