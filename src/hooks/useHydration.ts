'use client';

import { useEffect, useState } from 'react';

export function useHydration() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
    
    const extensionAttrs = ['data-dashlane-rid', 'data-dashlane-label'];

    const cleanupExtensionAttributes = () => {
      extensionAttrs.forEach((attr) => {
        document.querySelectorAll(`[${attr}]`).forEach((el) => {
          el.removeAttribute(attr);
        });
      });
    };

    const timeoutId = setTimeout(cleanupExtensionAttributes, 100);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName &&
          extensionAttrs.includes(mutation.attributeName) &&
          mutation.target instanceof Element
        ) {
          mutation.target.removeAttribute(mutation.attributeName);
        }
      });
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: extensionAttrs,
      subtree: true,
    });

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, []);

  return isHydrated;
}
