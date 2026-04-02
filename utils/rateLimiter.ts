/**
 * Rate Limiter Utility
 * Prevents brute force attacks and API abuse
 */

interface RateLimitConfig {
    maxAttempts: number;
    windowMs: number;
    blockDurationMs?: number;
}

interface AttemptRecord {
    attempts: number[];
    blockedUntil?: number;
}

const attemptStore = new Map<string, AttemptRecord>();

/**
 * Checks if an action is rate limited
 * @param key - Unique identifier (e.g., userId, email, IP)
 * @param config - Rate limit configuration
 * @returns true if allowed, false if blocked
 */
export const checkRateLimit = (
    key: string,
    config: RateLimitConfig = {
        maxAttempts: 5,
        windowMs: 60000, // 1 minute
        blockDurationMs: 300000 // 5 minutes
    }
): boolean => {
    const now = Date.now();
    const record = attemptStore.get(key) || { attempts: [] };

    // Check if currently blocked
    if (record.blockedUntil && now < record.blockedUntil) {
        return false; // Still blocked
    }

    // Remove old attempts outside the window
    record.attempts = record.attempts.filter(
        time => now - time < config.windowMs
    );

    // Check if exceeded max attempts
    if (record.attempts.length >= config.maxAttempts) {
        // Block the key
        record.blockedUntil = now + (config.blockDurationMs || config.windowMs * 5);
        attemptStore.set(key, record);
        return false; // Blocked
    }

    // Add current attempt
    record.attempts.push(now);
    attemptStore.set(key, record);
    return true; // Allowed
};

/**
 * Resets rate limit for a key (e.g., after successful login)
 * @param key - Unique identifier
 */
export const resetRateLimit = (key: string): void => {
    attemptStore.delete(key);
};

/**
 * Gets remaining attempts before rate limit
 * @param key - Unique identifier
 * @param maxAttempts - Maximum allowed attempts
 * @returns Number of remaining attempts
 */
export const getRemainingAttempts = (
    key: string,
    maxAttempts: number = 5
): number => {
    const record = attemptStore.get(key);
    if (!record) return maxAttempts;

    const now = Date.now();
    const recentAttempts = record.attempts.filter(
        time => now - time < 60000 // Last minute
    );

    return Math.max(0, maxAttempts - recentAttempts.length);
};

/**
 * Gets time until unblock (in milliseconds)
 * @param key - Unique identifier
 * @returns Milliseconds until unblock, or 0 if not blocked
 */
export const getTimeUntilUnblock = (key: string): number => {
    const record = attemptStore.get(key);
    if (!record || !record.blockedUntil) return 0;

    const now = Date.now();
    if (now >= record.blockedUntil) {
        return 0; // Already unblocked
    }

    return record.blockedUntil - now;
};

/**
 * Clears all rate limit records (use with caution)
 */
export const clearAllRateLimits = (): void => {
    attemptStore.clear();
};

// Cleanup old records periodically (every 10 minutes)
setInterval(() => {
    const now = Date.now();
    for (const [key, record] of attemptStore.entries()) {
        // Remove if no recent attempts and not blocked
        if (
            record.attempts.length === 0 ||
            (record.attempts.every(time => now - time > 600000) &&
                (!record.blockedUntil || now >= record.blockedUntil))
        ) {
            attemptStore.delete(key);
        }
    }
}, 600000); // 10 minutes
