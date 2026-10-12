import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Cookies from 'js-cookie';
import { User, LoginCredentials, AuthContextType } from '../types/auth';
import { AuthService } from '../services/authService';
import { 
  sanitizeInput, 
  validateEmail, 
  validatePassword, 
  rateLimiter,
  SECURITY_CONFIG 
} from '../config/security';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState<string>('');

  useEffect(() => {
    // Check for existing session on app load - check both localStorage and cookies
    const savedUser = localStorage.getItem('user') || Cookies.get('user');
    
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        // Validate the user data structure
        if (userData && userData.id && userData.email && userData.role) {
          setUser(userData);
        } else {
          // Invalid user data, remove from both storage locations
          localStorage.removeItem('user');
          Cookies.remove('user');
        }
      } catch {
        // Invalid user data, remove from both storage locations
        localStorage.removeItem('user');
        Cookies.remove('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    setLoginError(''); // Clear any previous errors
    
    try {
      // Input validation
      const sanitizedEmail = sanitizeInput(credentials.email);
      const sanitizedPassword = sanitizeInput(credentials.password);
      
      if (!validateEmail(sanitizedEmail)) {
        const errorMsg = 'Invalid email format';
        setLoginError(errorMsg);
        setLoading(false);
        return { success: false, error: errorMsg };
      }
      
      if (!validatePassword(sanitizedPassword)) {
        const errorMsg = 'Password must be at least 6 characters long';
        setLoginError(errorMsg);
        setLoading(false);
        return { success: false, error: errorMsg };
      }
      
      // Check rate limiting
      if (rateLimiter.isRateLimited(sanitizedEmail)) {
        const remainingTime = rateLimiter.getLockoutTimeRemaining(sanitizedEmail);
        const minutes = Math.ceil(remainingTime / (60 * 1000));
        const errorMsg = `Too many login attempts. Please try again in ${minutes} minutes.`;
        setLoginError(errorMsg);
        setLoading(false);
        return { success: false, error: errorMsg };
      }
      
      // Authenticate using the database service
      const authResult = await AuthService.authenticateUser({
        email: sanitizedEmail,
        password: sanitizedPassword
      });

      if (authResult.success && authResult.user) {
        setUser(authResult.user);
        setLoginError(''); // Clear error on success
        
        // The token is already stored in localStorage by AuthService.authenticateUser
        // We can get it from there and also save it to cookies
        const token = localStorage.getItem('authToken');
        
        if (token) {
          // Save user data and token to cookies
          Cookies.set('user', JSON.stringify(authResult.user), { 
            expires: SECURITY_CONFIG.SESSION.COOKIE_EXPIRES,
            secure: SECURITY_CONFIG.SESSION.SECURE_COOKIES,
            sameSite: SECURITY_CONFIG.SESSION.SAME_SITE
          });
          
          Cookies.set('token', token, {
            expires: SECURITY_CONFIG.SESSION.COOKIE_EXPIRES,
            secure: SECURITY_CONFIG.SESSION.SECURE_COOKIES,
            sameSite: SECURITY_CONFIG.SESSION.SAME_SITE
          });
        }
        
        rateLimiter.recordAttempt(sanitizedEmail, true);
        setLoading(false);
        return { success: true };
      } else {
        rateLimiter.recordAttempt(sanitizedEmail, false);
        const remainingAttempts = rateLimiter.getRemainingAttempts(sanitizedEmail);
        const errorMsg = authResult.error || `Invalid credentials. ${remainingAttempts} attempts remaining.`;
        setLoginError(errorMsg);
        setLoading(false);
        return { success: false, error: errorMsg };
      }
    } catch {
      setLoading(false);
      return { success: false, error: 'An error occurred during login. Please try again.' };
    }
  };

  const logout = () => {
    setUser(null);
    setLoginError(''); // Clear login error on logout
    // Clear from both localStorage and cookies
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    Cookies.remove('user');
    Cookies.remove('token');
    // Clear any URL parameters or state by redirecting to login page
    window.location.href = '/';
  };

  const clearLoginError = () => {
    setLoginError('');
  };

  const hasPermission = (module: string, action: string): boolean => {
    if (!user) {
      return false;
    }
    
    const modulePermission = user.permissions.find(p => p.module === module);
    const hasAccess = modulePermission ? modulePermission.actions.includes(action) : false;
    
    return hasAccess;
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    hasPermission,
    loading,
    loginError,
    clearLoginError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { useAuth };
export default AuthProvider;
