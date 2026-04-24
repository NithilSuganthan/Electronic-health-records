// Centralized API configuration for the Spring Boot backend
// Uses environment variable in production, falls back to localhost in development
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

/**
 * Helper to build API endpoint URLs.
 * Usage: api('/api/doctors') → 'http://localhost:8080/api/doctors'
 */
export const api = (path: string): string => `${API_BASE_URL}${path}`;
