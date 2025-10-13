'use client';

import { useEffect, useState } from 'react';

export function useHydration() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
    
    // Clean up browser extension attributes that cause hydration mismatches
    const cleanupExtensionAttributes = () => {
      const elements = document.querySelectorAll('[data-dashlane-rid]');
      elements.forEach(el => {
        el.removeAttribute('data-dashlane-rid');
      });
    };

    // Run cleanup after a short delay to allow extensions to inject
    const timeoutId = setTimeout(cleanupExtensionAttributes, 100);

    // Also run cleanup on any DOM mutations
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && 
            mutation.attributeName === 'data-dashlane-rid' &&
            mutation.target instanceof Element) {
          mutation.target.removeAttribute('data-dashlane-rid');
        }
      });
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-dashlane-rid'],
      subtree: true
    });

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, []);

  return isHydrated;
}
