/**
 * Date formatting utilities
 */

/**
 * Format a date string or Date object to a readable format (DD-MM-YYYY)
 * @param date - Date string, Date object, or null/undefined
 * @param defaultValue - Value to return if date is invalid (default: '-')
 * @returns Formatted date string
 */
export function formatDate(date: string | Date | null | undefined, defaultValue: string = '-'): string {
  if (!date) return defaultValue;
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return defaultValue;
    }
    
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    
    return `${day}-${month}-${year}`;
  } catch {
    return defaultValue;
  }
}

/**
 * Format a date to YYYY-MM-DD format (for input fields)
 * @param date - Date string, Date object, or null/undefined
 * @param defaultValue - Value to return if date is invalid (default: '')
 * @returns Formatted date string
 */
export function formatDateForInput(date: string | Date | null | undefined, defaultValue: string = ''): string {
  if (!date) return defaultValue;
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return defaultValue;
    }
    
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch {
    return defaultValue;
  }
}

/**
 * Format a date to a localized string (e.g., "Oct 9, 2025")
 * @param date - Date string, Date object, or null/undefined
 * @param defaultValue - Value to return if date is invalid (default: '-')
 * @returns Formatted date string
 */
export function formatDateLocalized(date: string | Date | null | undefined, defaultValue: string = '-'): string {
  if (!date) return defaultValue;
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return defaultValue;
    }
    
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return defaultValue;
  }
}

/**
 * Check if a date is in ISO format (e.g., "2025-08-10T00:00:00.000Z")
 * @param date - Date string to check
 * @returns true if date is in ISO format
 */
export function isISODate(date: string): boolean {
  if (!date) return false;
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(date);
}
