
/**
 * A definitive, robust function to get a readable string message from any error.
 * This function is designed to be "bulletproof" by defensively checking for
 * various error formats and translating common technical errors into user-friendly messages.
 *
 * @param error The error to process.
 * @returns A string representation of the error message.
 */

export const getErrorMessage = (error: unknown): string => {
    // 1. Handle explicit strings first.
    if (typeof error === 'string') {
        // Fallback catch for the specific message reported by the user.
        if (error.includes("Unable to save: A related record") || error.includes("User Profile) is missing")) {
             return 'Profile Missing. Your account is missing a required profile record. Please contact support.';
        }
        return error;
    }

    let message = '';

    // 2. Handle objects with a string 'message' property (most common for Supabase/API errors).
    if (error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
        message = (error as { message: string }).message;
    }
    // 3. Handle standard JavaScript Error objects.
    else if (error instanceof Error) {
        message = error.message;
    }

    // Specific catch for the persisting foreign key error
    if (message.includes('fk_subject_code_exists') || message.includes('subject_codes') || message.includes('relation "public.subject_codes" does not exist')) {
        return 'Database Error: Obsolete database constraint detected. Please contact administrator.';
    }
    
    // Fix for: operator does not exist: text = notification_type
    if (message.includes('operator does not exist') && (message.includes('notification_type') || message.includes('text ='))) {
        return 'Database Error: Type Mismatch (Notification Enum). Please contact administrator.';
    }
    
    // Fix for: type "notification_type" does not exist
    if (message.includes('type "notification_type" does not exist')) {
        return 'Database Error: Type Mismatch (Notification Enum Missing). Please contact administrator.';
    }
    
    // Fix for relation "public.notifications" does not exist
    if (message.includes('relation "public.notifications" does not exist')) {
        return 'Database Error: Notification table mismatch. Please contact administrator.';
    }

    // Translate common technical errors
    if (message.includes('duplicate key value violates unique constraint')) {
        return 'An item with this name or code already exists. Please choose a different one.';
    }
    
    // Improve Foreign Key Violation and RLS Error Messaging
    if (message.includes('violates foreign key constraint') || message.includes('violates row-level security policy') || message.includes('violates check constraint')) {
        // "update or delete on table" specifically implies that the current item cannot be removed because other tables reference it.
        if (message.includes('update or delete on table') && !message.includes('profiles')) {
             return 'This item cannot be deleted because it is being used by other records (e.g., enrolled students or linked decks).';
        }
        // "insert or update on table" implies the item we are trying to save references a parent that doesn't exist or permissions are wrong.
        return 'Database Permission Error: Your account is missing a required profile record or a database policy is blocking the action.';
    }

    if (message.includes('User not found')) {
        return 'No user was found with the provided credentials.';
    }
     if (message.includes('Invalid login credentials')) {
        return 'Invalid email or password. Please try again.';
    }
    if (message.includes('structure of query does not match function result type')) {
        return 'Database Error: The analytics function in the database has a data type mismatch. Please ask your administrator to update the database functions.';
    }
    if (message.includes('Could not choose the best candidate function')) {
        return 'Database Error: The database has conflicting function versions. Please ask your administrator to resolve this.';
    }
    if (message.includes('relation') && message.includes('does not exist')) {
         console.error("CRITICAL DATABASE ERROR: Missing Database Relation.");
         return 'Database Error: Missing database relations (tables/views).';
    }
    if (message.includes('function') && message.includes('does not exist')) {
         console.error("CRITICAL DATABASE ERROR: Missing Database Function.");
         return 'Database Error: Missing database functions.';
    }
    if (message.includes('column') && message.includes('does not exist')) {
         console.error("CRITICAL DATABASE ERROR: Schema mismatch (missing column).");
         return 'Database Error: Database schema mismatch (missing column).';
    }
    if (message.includes('stack depth limit exceeded') || message.includes('infinite recursion')) {
        console.error("CRITICAL DATABASE ERROR: Infinite recursion in RLS policies detected.");
        return 'Database Error: Infinite recursion detected in database policies.';
    }
    if (message.includes('cannot alter type of a column used by a view or rule')) {
        console.error("CRITICAL DATABASE ERROR: Dependent views blocking schema update.");
        return 'Database Error: Dependent views blocking update.';
    }
    
    // Supabase paused / Network issues
    if (message.includes('Failed to fetch') || message.includes('NetworkError') || message.includes('503')) {
        return 'Unable to connect to the server. The database might be paused due to inactivity. Please check the Supabase dashboard to restore the project.';
    }

    if (message) {
        return message;
    }

    // 4. As a fallback, try to stringify the entire error object.
    try {
        const str = JSON.stringify(error, null, 2); // Pretty-print for better debugging
        if (str !== '{}') {
            return str;
        }
    } catch {
        // Fall through to the final, safest fallback.
    }

    // 5. The ultimate fallback.
    try {
        return `[Unstructured Error]: ${String(error)}`;
    } catch {
        return 'An unknown and un-stringifiable error occurred.';
    }
};
