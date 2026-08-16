'use client';

import React from 'react';

import { GUIDE_STYLES } from '@/content/guides/styles';

interface GuideDocumentProps {
  /** Static, author-written guide markup from `@/content/guides`. */
  html: string;
}

/**
 * Renders one of the onboarding guides.
 *
 * The markup ships as a string because the guides are hand-authored documents
 * with inline SVG diagrams — converting them to JSX buys nothing and loses the
 * ability to regenerate them from the published source. Nothing here is user
 * input, so there is no injection surface.
 */
export function GuideDocument({ html }: GuideDocumentProps) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GUIDE_STYLES }} />
      <div className="guide-doc" dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}

export default GuideDocument;
