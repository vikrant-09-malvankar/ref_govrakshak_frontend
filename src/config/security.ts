// Security configuration for the application
export const SECURITY_CONFIG = {
  // Rate limiting settings
  RATE_LIMITING: {
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes in milliseconds
    RESET_AFTER_SUCCESS: true,
  },
  
  // Password requirements
  PASSWORD: {
    MIN_LENGTH: 6,
    REQUIRE_UPPERCASE: false,
    REQUIRE_LOWERCASE: false,
    REQUIRE_NUMBERS: false,
    REQUIRE_SPECIAL_CHARS: false,
  },
  
  // Session settings
  SESSION: {
    COOKIE_EXPIRES: 7, // days
    SECURE_COOKIES: process.env.NODE_ENV === 'production',
    SAME_SITE: 'strict' as const,
    HTTP_ONLY: false, // Set to true when using server-side cookies
  },
  
  // Input validation
  VALIDATION: {
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    SANITIZE_HTML: true,
    MAX_INPUT_LENGTH: 1000,
  },
  
  // CSRF protection
  CSRF: {
    ENABLED: true,
    TOKEN_NAME: 'csrf-token',
    HEADER_NAME: 'X-CSRF-Token',
  },
  
  // Content Security Policy
  CSP: {
    ENABLED: true,
    DEFAULT_SRC: ["'self'"],
    SCRIPT_SRC: ["'self'", "'unsafe-inline'"],
    STYLE_SRC: ["'self'", "'unsafe-inline'"],
    IMG_SRC: ["'self'", "data:", "https:"],
    CONNECT_SRC: ["'self'"],
    FONT_SRC: ["'self'"],
    OBJECT_SRC: ["'none'"],
    MEDIA_SRC: ["'self'"],
    FRAME_SRC: ["'none'"],
  },
  
  // Headers
  HEADERS: {
    X_FRAME_OPTIONS: 'DENY',
    X_CONTENT_TYPE_OPTIONS: 'nosniff',
    X_XSS_PROTECTION: '1; mode=block',
    REFERRER_POLICY: 'strict-origin-when-cross-origin',
    PERMISSIONS_POLICY: 'geolocation=(), microphone=(), camera=()',
  },
};

// Security utility functions
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  
  let sanitized = input.trim();
  
  // Remove HTML tags if CSP is enabled
  if (SECURITY_CONFIG.VALIDATION.SANITIZE_HTML) {
    sanitized = sanitized.replace(/[<>]/g, '');
  }
  
  // Limit input length
  if (sanitized.length > SECURITY_CONFIG.VALIDATION.MAX_INPUT_LENGTH) {
    sanitized = sanitized.substring(0, SECURITY_CONFIG.VALIDATION.MAX_INPUT_LENGTH);
  }
  
  return sanitized;
};

export const validateEmail = (email: string): boolean => {
  return SECURITY_CONFIG.VALIDATION.EMAIL_REGEX.test(email);
};

export const validatePassword = (password: string): boolean => {
  if (password.length < SECURITY_CONFIG.PASSWORD.MIN_LENGTH) {
    return false;
  }
  
  // Add additional password validation rules here if needed
  if (SECURITY_CONFIG.PASSWORD.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    return false;
  }
  
  if (SECURITY_CONFIG.PASSWORD.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    return false;
  }
  
  if (SECURITY_CONFIG.PASSWORD.REQUIRE_NUMBERS && !/\d/.test(password)) {
    return false;
  }
  
  if (SECURITY_CONFIG.PASSWORD.REQUIRE_SPECIAL_CHARS && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return false;
  }
  
  return true;
};

export const generateCSRFToken = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const validateCSRFToken = (token: string, storedToken: string): boolean => {
  return token === storedToken;
};

// Rate limiting implementation
class RateLimiter {
  private attempts = new Map<string, { count: number; lastAttempt: number }>();
  
  isRateLimited(identifier: string): boolean {
    const attempts = this.attempts.get(identifier);
    if (!attempts) return false;
    
    const now = Date.now();
    if (now - attempts.lastAttempt > SECURITY_CONFIG.RATE_LIMITING.LOCKOUT_DURATION) {
      this.attempts.delete(identifier);
      return false;
    }
    
    return attempts.count >= SECURITY_CONFIG.RATE_LIMITING.MAX_LOGIN_ATTEMPTS;
  }
  
  recordAttempt(identifier: string, success: boolean): void {
    const attempts = this.attempts.get(identifier) || { count: 0, lastAttempt: 0 };
    
    if (success && SECURITY_CONFIG.RATE_LIMITING.RESET_AFTER_SUCCESS) {
      this.attempts.delete(identifier);
    } else {
      attempts.count++;
      attempts.lastAttempt = Date.now();
      this.attempts.set(identifier, attempts);
    }
  }
  
  getRemainingAttempts(identifier: string): number {
    const attempts = this.attempts.get(identifier);
    if (!attempts) return SECURITY_CONFIG.RATE_LIMITING.MAX_LOGIN_ATTEMPTS;
    
    const now = Date.now();
    if (now - attempts.lastAttempt > SECURITY_CONFIG.RATE_LIMITING.LOCKOUT_DURATION) {
      this.attempts.delete(identifier);
      return SECURITY_CONFIG.RATE_LIMITING.MAX_LOGIN_ATTEMPTS;
    }
    
    return Math.max(0, SECURITY_CONFIG.RATE_LIMITING.MAX_LOGIN_ATTEMPTS - attempts.count);
  }
  
  getLockoutTimeRemaining(identifier: string): number {
    const attempts = this.attempts.get(identifier);
    if (!attempts) return 0;
    
    const now = Date.now();
    const timeElapsed = now - attempts.lastAttempt;
    const timeRemaining = SECURITY_CONFIG.RATE_LIMITING.LOCKOUT_DURATION - timeElapsed;
    
    return Math.max(0, timeRemaining);
  }
}

export const rateLimiter = new RateLimiter(); 