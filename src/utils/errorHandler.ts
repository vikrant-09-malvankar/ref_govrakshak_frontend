// Global error handler to suppress harmless message channel errors
export const setupGlobalErrorHandling = () => {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    
    // Suppress message channel errors (usually harmless)
    if (error && typeof error === 'object' && 'message' in error) {
      const message = String(error.message);
      if (message.includes('message channel closed') || 
          message.includes('asynchronous response')) {
        console.warn('Suppressing message channel error:', message);
        event.preventDefault();
        return;
      }
    }
    
    // Log other unhandled rejections
    console.error('Unhandled promise rejection:', error);
  });

  // Handle global errors
  window.addEventListener('error', (event) => {
    const error = event.error;
    
    // Suppress message channel errors
    if (error && typeof error === 'object' && 'message' in error) {
      const message = String(error.message);
      if (message.includes('message channel closed') || 
          message.includes('asynchronous response')) {
        console.warn('Suppressing message channel error:', message);
        event.preventDefault();
        return;
      }
    }
    
    // Log other errors
    console.error('Global error:', error);
  });
};

// Function to check if an error is a message channel error
export const isMessageChannelError = (error: any): boolean => {
  if (!error || typeof error !== 'object') return false;
  
  const message = String(error.message || '');
  return message.includes('message channel closed') || 
         message.includes('asynchronous response');
};

// Function to safely log errors (suppressing message channel errors)
export const safeLogError = (error: any, context?: string) => {
  if (isMessageChannelError(error)) {
    console.warn('Suppressing message channel error:', error.message);
    return;
  }
  
  if (context) {
    console.error(`Error in ${context}:`, error);
  } else {
    console.error('Error:', error);
  }
};
