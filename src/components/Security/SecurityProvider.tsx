import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { generateCSRFToken, validateCSRFToken, SECURITY_CONFIG } from '../../config/security';

interface SecurityContextType {
  csrfToken: string;
  validateCSRFToken: (token: string) => boolean;
  refreshCSRFToken: () => void;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

interface SecurityProviderProps {
  children: ReactNode;
}

export const SecurityProvider: React.FC<SecurityProviderProps> = ({ children }) => {
  const [csrfToken, setCsrfToken] = useState<string>('');

  useEffect(() => {
    // Generate CSRF token on component mount
    const token = generateCSRFToken();
    setCsrfToken(token);
    
    // Store token in session storage for validation
    sessionStorage.setItem(SECURITY_CONFIG.CSRF.TOKEN_NAME, token);
  }, []);

  const validateToken = (token: string): boolean => {
    const storedToken = sessionStorage.getItem(SECURITY_CONFIG.CSRF.TOKEN_NAME);
    return validateCSRFToken(token, storedToken || '');
  };

  const refreshCSRFToken = () => {
    const newToken = generateCSRFToken();
    setCsrfToken(newToken);
    sessionStorage.setItem(SECURITY_CONFIG.CSRF.TOKEN_NAME, newToken);
  };

  const value: SecurityContextType = {
    csrfToken,
    validateCSRFToken: validateToken,
    refreshCSRFToken
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = (): SecurityContextType => {
  const context = useContext(SecurityContext);
  if (context === undefined) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};

export default SecurityProvider; 