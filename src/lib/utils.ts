import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sanitize filename for Supabase Storage compatibility
 * Removes invalid characters while preserving extension
 */
export function sanitizeFilename(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  const name = lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
  const ext = lastDotIndex > 0 ? filename.substring(lastDotIndex) : '';
  
  // Remove invalid characters: [ ] { } ^ % ` > < ~ # | and spaces
  const sanitized = name
    .replace(/[\[\]\{\}\^%`><~#\|]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  
  // Truncate if too long (max 255 chars)
  const maxLength = 255 - ext.length;
  const truncated = sanitized.length > maxLength ? sanitized.substring(0, maxLength) : sanitized;
  
  return truncated + ext;
}
