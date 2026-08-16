'use client';

import Image from 'next/image';
import React, { useEffect, useMemo, useState } from 'react';

interface SafeImageProps {
  src?: string | null;
  alt: string;
  width: number;
  height: number;
  className?: string;
  fallback?: React.ReactNode;
}

function resolveImageUrl(src?: string | null): string | null {
  const value = src?.trim();
  if (!value) return null;

  if (/^https?:\/\//i.test(value)) return value;

  // Uploaded files are served by the API. Bare seed filenames are not valid
  // URLs and should render the fallback instead of producing a backend 404.
  if (value.startsWith('/uploads/')) {
    const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
    return apiBase ? `${apiBase}${value}` : null;
  }

  if (value.startsWith('/')) return value;

  return null;
}

export function SafeImage({
  src,
  alt,
  width,
  height,
  className,
  fallback,
}: SafeImageProps) {
  const resolvedSrc = useMemo(() => resolveImageUrl(src), [src]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [resolvedSrc]);

  if (!resolvedSrc || failed) {
    return <>{fallback ?? null}</>;
  }

  return (
    <Image
      src={resolvedSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      // External storage may reject Next's server-side optimizer. Loading it
      // directly lets the browser fail gracefully into the local fallback.
      unoptimized={/^https?:\/\//i.test(resolvedSrc)}
      onError={() => setFailed(true)}
    />
  );
}
