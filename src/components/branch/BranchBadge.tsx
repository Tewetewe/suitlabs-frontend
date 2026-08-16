'use client';

import { Badge } from '@/components/ui/DataDisplay';
import { useBranch } from '@/contexts/BranchContext';
import { Branch } from '@/types';

export function BranchBadge({ branch, always = false }: { branch?: Branch | null; always?: boolean }) {
  const { viewingAll } = useBranch();
  if (!branch) return null;
  if (!always && !viewingAll) return null;
  const variant = branch.code.toLowerCase().includes('nusa') ? 'success' : 'primary';
  return <Badge variant={variant}>{branch.name}</Badge>;
}
