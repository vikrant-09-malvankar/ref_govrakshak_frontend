import React from 'react';

// Error boundary component for lazy-loaded components
class LazyLoadErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Handle lazy load error
    if (errorInfo) {
      // Log error info if available
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-4 text-center">
            <p className="text-red-600 mb-2">Failed to load component</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

// Enhanced lazy loading with retry logic
export function lazyLoad<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  retries = 3
): React.LazyExoticComponent<T> {
  return React.lazy(() => {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      
      const attemptLoad = () => {
        importFunc()
          .then(resolve)
          .catch((error) => {
            attempts++;
            if (attempts < retries) {
              console.warn(`Lazy load attempt ${attempts} failed, retrying...`, error);
              setTimeout(attemptLoad, 1000 * attempts); // Exponential backoff
            } else {
              // All lazy load attempts failed
              reject(error);
            }
          });
      };
      
      attemptLoad();
    });
  });
}

// Wrapper component that combines lazy loading with error boundary
export function LazyComponent<T extends React.ComponentType<any>>({
  component,
  fallback,
  ...props
}: {
  component: React.LazyExoticComponent<T>;
  fallback?: React.ReactNode;
} & React.ComponentProps<T>) {
  const Component = component;
  
  return (
    <LazyLoadErrorBoundary fallback={fallback}>
      <React.Suspense fallback={fallback || <div>Loading...</div>}>
        <Component {...props} />
      </React.Suspense>
    </LazyLoadErrorBoundary>
  );
}

// Preload function for critical components
export function preloadComponent<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
): void {
  // Start loading the component in the background
  importFunc().catch(() => {
    // Silently fail preloading
  });
} 