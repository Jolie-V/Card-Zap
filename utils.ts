
/**
 * A definitive, robust function to get a readable string message from any error.
 * This function is designed to be "bulletproof" by defensively checking for
 * various error formats in a specific order to prevent "[object Object]" outputs.
 *
 * @param error The error to process.
 * @returns A string representation of the error message.
 */
export const getErrorMessage = (error: unknown): string => {
    // 1. Handle explicit strings first.
    if (typeof error === 'string') {
        return error;
    }

    // 2. Handle objects with a string 'message' property (most common for Supabase/API errors).
    if (error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
        return (error as { message: string }).message;
    }

    // 3. Handle standard JavaScript Error objects.
    if (error instanceof Error) {
        return error.message;
    }

    // 4. As a fallback, try to stringify the entire error object.
    try {
        const str = JSON.stringify(error, null, 2); // Pretty-print for better debugging
        // Avoid returning an empty object string if possible
        if (str !== '{}') {
            return str;
        }
    } catch {
        // This catch handles errors during stringification (e.g., circular references)
        // Fall through to the final, safest fallback.
    }

    // 5. The ultimate fallback: convert the error to a string, which might result in [object Object]
    // but is better than crashing. We add a prefix to indicate it's a fallback.
    try {
        return `[Unstructured Error]: ${String(error)}`;
    } catch {
        return 'An unknown and un-stringifiable error occurred.';
    }
};
