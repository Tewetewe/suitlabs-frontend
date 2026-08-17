'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link, { useLinkStatus } from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useBranch } from '@/contexts/BranchContext';
import { ALL_BRANCHES_ID, branchAccent } from '@/lib/branch-scope';
import { Menu as HeadlessMenu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  Calendar, 
  FileText, 
  Settings, 
  LogOut,
  Menu,
  X,
  Tags,
  UserCog,
  Shirt,
  FileSpreadsheet,
  BarChart3,
  ShoppingBag,
  Wallet,
  Landmark,
  Store,
  Smartphone,
  Monitor,
  MapPin,
  Receipt,
  BookOpen,
  TrendingUp,
} from 'lucide-react';
import clsx from 'clsx';
import { CashierChromeProvider, useCashierChrome } from '@/components/cashier/CashierChromeContext';
import { Select } from '@/components/ui/Select';

type NavigationRole = 'admin' | 'staff' | 'user';

type NavigationItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: NavigationRole[];
};

type NavigationSection = {
  title: string | null;
  items: NavigationItem[];
};

const navigationSections: NavigationSection[] = [
  {
    title: null as string | null,
    items: [
      { name: 'Cashier', href: '/dashboard/cashier', icon: Store, roles: ['admin', 'staff'] },
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'staff'] },
      { name: 'Bookings', href: '/dashboard/bookings', icon: Calendar, roles: ['admin', 'staff'] },
      { name: 'Rentals', href: '/dashboard/rentals', icon: FileText, roles: ['admin', 'staff'] },
      { name: 'Expenses', href: '/dashboard/expenses', icon: Wallet, roles: ['admin', 'staff'] },
      { name: 'Sales', href: '/dashboard/sales', icon: ShoppingBag, roles: ['admin', 'staff'] },
    ],
  },
  {
    title: 'Master Data',
    items: [
      { name: 'Items', href: '/dashboard/items', icon: Shirt, roles: ['admin', 'staff'] },
      { name: 'Customers', href: '/dashboard/customers', icon: Users, roles: ['admin', 'staff'] },
      { name: 'Package Pricing', href: '/dashboard/package-pricing', icon: Package, roles: ['admin', 'staff'] },
      { name: 'Discounts', href: '/dashboard/discounts', icon: Tags, roles: ['admin', 'staff'] },
      { name: 'Categories', href: '/dashboard/categories', icon: Settings, roles: ['admin', 'staff'] },
      { name: 'Users', href: '/dashboard/users', icon: UserCog, roles: ['admin'] },
    ],
  },
  {
    title: 'Admin',
    items: [
      { name: 'Bulk Input Sync', href: '/dashboard/admin/bulk-input-sync', icon: FileSpreadsheet, roles: ['admin'] },
      { name: 'Assets', href: '/dashboard/admin/assets', icon: Landmark, roles: ['admin'] },
      { name: 'Analytics', href: '/dashboard/admin/rental-analytics', icon: TrendingUp, roles: ['admin'] },
      { name: 'Financial Report', href: '/dashboard/admin/financial-report', icon: BarChart3, roles: ['admin'] },
      { name: 'Branches', href: '/dashboard/admin/branches', icon: MapPin, roles: ['admin'] },
    ],
  },
  {
    title: 'Guides',
    items: [
      { name: 'Cashier Guide', href: '/dashboard/guides/cashier', icon: Receipt, roles: ['admin', 'staff'] },
      { name: 'Operations Handbook', href: '/dashboard/guides/handbook', icon: BookOpen, roles: ['admin'] },
    ],
  },
] ;

const navigation = navigationSections.flatMap((s) => s.items);

function isNavActive(href: string, pathname: string | null) {
  return href === pathname || (href !== '/dashboard' && Boolean(pathname?.startsWith(href)));
}

function NavPendingShade({ isActive }: { isActive: boolean }) {
  const { pending } = useLinkStatus();
  if (!pending || isActive) return null;
  return <span className="pointer-events-none absolute inset-0 rounded-[inherit] bg-indigo-50/80" aria-hidden />;
}

function SidebarLink({
  href,
  isActive,
  className,
  onNavigate,
  innerRef,
  children,
  ...rest
}: {
  href: string;
  isActive: boolean;
  className: string;
  onNavigate?: () => void;
  innerRef?: React.Ref<HTMLAnchorElement>;
  children: React.ReactNode;
} & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const router = useRouter();
  return (
    <Link
      href={href}
      ref={innerRef}
      prefetch
      onClick={onNavigate}
      onMouseEnter={() => router.prefetch(href)}
      onFocus={() => router.prefetch(href)}
      className={clsx('relative', className)}
      {...rest}
    >
      <NavPendingShade isActive={isActive} />
      {children}
    </Link>
  );
}

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <CashierChromeProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </CashierChromeProvider>
  );
}

function DashboardLayoutInner({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, loading, isAuthenticated } = useAuth();
  const { allowedBranches, currentBranch, currentBranchId, viewingAll, setCurrentBranchId } = useBranch();
  const activeNavRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      setSidebarOpen(false);
      router.replace('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    const node = activeNavRef.current;
    if (!node) return;

    const reveal = () => {
      const nav = node.closest('nav');
      if (nav instanceof HTMLElement) {
        const nodeRect = node.getBoundingClientRect();
        const navRect = nav.getBoundingClientRect();
        const offset = nodeRect.top - navRect.top - (navRect.height / 2 - nodeRect.height / 2);
        nav.scrollTo({ top: nav.scrollTop + offset, behavior: 'smooth' });
      } else {
        node.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
      }
      if (sidebarOpen) {
        node.focus({ preventScroll: true });
      }
    };

    const frame = window.requestAnimationFrame(reveal);
    const timer = window.setTimeout(reveal, sidebarOpen ? 320 : 0);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [pathname, sidebarOpen]);

  const initials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`;
  const role = user?.role as NavigationRole | undefined;
  const isCashier = pathname === '/dashboard/cashier';
  const { chrome, setChrome } = useCashierChrome();
  const cashierPhone = isCashier && chrome === 'phone';
  const allowedNavigation = navigation.filter(item => !item.roles || (role ? item.roles.includes(role) : false));
  const mobileNavigation = allowedNavigation.filter(item =>
    ['/dashboard/cashier', '/dashboard/bookings', '/dashboard/rentals', '/dashboard/items', '/dashboard/sales'].includes(item.href)
  );
  const activePage = navigation.find((item) => isNavActive(item.href, pathname));

  return (
    <div className={clsx(isCashier ? 'h-dvh overflow-hidden bg-transparent' : 'min-h-screen bg-transparent')}>
      {/* ── Drawer overlay (mobile always; cashier also on tablet) ── */}
      {sidebarOpen && (
        <div
          className={clsx(
            'fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-fade-in',
            !isCashier && 'md:hidden'
          )}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ───────────────────────────────────────────────── */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col',
          'glass-panel-strong',
          'transform transition-transform duration-300 ease-in-out',
          !isCashier && 'md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center gap-3 px-5 border-b border-black/5">
          <Link href="/dashboard" className="flex items-center min-w-0">
            <Image
              src="/suitlabs-logo.svg"
              alt="SuitLabs"
              width={180}
              height={48}
              priority
              className="h-7 w-auto"
            />
          </Link>

          <button
            className={clsx(
              'ml-auto text-slate-500 hover:text-slate-900 touch-manipulation min-h-11 min-w-11 flex items-center justify-center',
              !isCashier && 'md:hidden'
            )}
            aria-label="Close menu"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navigationSections.map((section) => {
            const items = section.items.filter(item => !item.roles || (role ? item.roles.includes(role) : false));
            if (items.length === 0) return null;

            return (
              <div key={section.title ?? 'main'} className="space-y-1">
                {section.title && (
                  <div className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {section.title}
                  </div>
                )}

                {items.map((item) => {
                  const isActive = isNavActive(item.href, pathname);
                  return (
                    <SidebarLink
                      key={item.name}
                      href={item.href}
                      isActive={isActive}
                      innerRef={isActive ? activeNavRef : undefined}
                      onNavigate={() => setSidebarOpen(false)}
                      data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                      className={clsx(
                        'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors touch-manipulation',
                        isActive
                          ? 'bg-indigo-50 text-indigo-950'
                          : 'text-slate-600 hover:bg-indigo-50/70 hover:text-slate-900'
                      )}
                    >
                      <item.icon
                        className={clsx(
                          'h-4 w-4 shrink-0 transition-colors',
                          isActive ? 'text-indigo-600' : 'text-slate-500 group-hover:text-slate-700'
                        )}
                      />
                      {item.name}
                    </SidebarLink>
                  );
                })}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* ── Main area ─────────────────────────────────────────────── */}
      <div className={clsx(!isCashier && 'md:pl-72', isCashier && 'flex h-dvh flex-col')}>
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-black/5 bg-white px-3 sm:gap-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
              data-testid="open-nav"
              className={clsx(
                '-ml-1 flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 hover:bg-indigo-50 touch-manipulation',
                !isCashier && 'md:hidden'
              )}
            >
              <Menu className="h-5 w-5" />
            </button>

            {activePage && (
              <span className={clsx('truncate text-sm font-semibold text-slate-800', isCashier && 'hidden sm:inline')}>
                {activePage.name}
              </span>
            )}
          </div>

          {isCashier && (
            <div className="flex rounded-full bg-white p-0.5 ring-1 ring-black/10">
              <button
                type="button"
                onClick={() => setChrome('phone')}
                className={clsx(
                  'flex h-9 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold touch-manipulation sm:px-3',
                  chrome === 'phone' ? 'bg-slate-900 text-white' : 'text-slate-600'
                )}
              >
                <Smartphone className="h-3.5 w-3.5" />
                Phone
              </button>
              <button
                type="button"
                onClick={() => setChrome('counter')}
                className={clsx(
                  'flex h-9 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold touch-manipulation sm:px-3',
                  chrome === 'counter' ? 'bg-slate-900 text-white' : 'text-slate-600'
                )}
              >
                <Monitor className="h-3.5 w-3.5" />
                Counter
              </button>
            </div>
          )}

          <div className="flex items-center gap-3">
            {(user?.role === 'admin' || allowedBranches.length > 1) && (
              <label className="sr-only" htmlFor="branch-switcher">Current shop</label>
            )}
            {(user?.role === 'admin' || allowedBranches.length > 1) ? (
              <div className="flex items-center gap-2">
                <span
                  className={clsx(
                    'hidden h-2.5 w-2.5 rounded-full sm:block',
                    viewingAll
                      ? 'bg-slate-400'
                      : branchAccent(currentBranch?.code) === 'emerald'
                        ? 'bg-emerald-500'
                        : 'bg-indigo-500'
                  )}
                />
                <div className="w-40 sm:w-48">
                  <Select
                    id="branch-switcher"
                    size="sm"
                    searchable
                    value={viewingAll ? ALL_BRANCHES_ID : (currentBranchId || '')}
                    onChange={(e) => {
                      const next = e.target.value;
                      setCurrentBranchId(next === ALL_BRANCHES_ID ? null : next);
                    }}
                    options={[
                      ...(user?.role === 'admin' ? [{ value: ALL_BRANCHES_ID, label: 'All branches' }] : []),
                      ...allowedBranches.map((branch) => ({ value: branch.id, label: branch.name })),
                    ]}
                    searchPlaceholder="Shop"
                    emptyMessage="No shops"
                  />
                </div>
              </div>
            ) : currentBranch ? (
              <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 ring-1 ring-black/10">
                <span className={clsx(
                  'h-2.5 w-2.5 rounded-full',
                  branchAccent(currentBranch.code) === 'emerald' ? 'bg-emerald-500' : 'bg-indigo-500'
                )} />
                {currentBranch.name}
              </div>
            ) : null}

            <HeadlessMenu as="div" className="relative">
              <MenuButton
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-b from-indigo-500 to-indigo-600 text-xs font-bold text-white shrink-0 shadow-sm shadow-indigo-500/20 ring-1 ring-black/5 hover:shadow-md transition touch-manipulation"
                aria-label="Open user menu"
              >
                {initials}
              </MenuButton>

              <MenuItems
                anchor="bottom end"
                className={clsx(
                  'z-50 mt-2 w-64 origin-top-right rounded-2xl bg-white/95 p-2 shadow-xl ring-1 ring-black/10 backdrop-blur-xl',
                  'focus:outline-none'
                )}
              >
                <div className="px-3 py-2">
                  <div className="text-sm font-semibold text-slate-900">
                    {user?.first_name} {user?.last_name}
                  </div>
                  <div className="text-xs text-slate-500">{user?.role}</div>
                </div>

                <div className="my-1 h-px bg-black/5" />

                <MenuItem>
                  {({ focus }) => (
                    <button
                      onClick={logout}
                      className={clsx(
                        'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors touch-manipulation',
                        focus ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-100'
                      )}
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  )}
                </MenuItem>
              </MenuItems>
            </HeadlessMenu>
          </div>
        </header>

        <main
          key={viewingAll ? ALL_BRANCHES_ID : (currentBranchId || 'shop')}
          className={clsx(
            isCashier
              ? 'flex min-h-0 flex-1 flex-col overflow-hidden p-0'
              : 'p-4 pb-24 sm:p-6 sm:pb-24 md:pb-8 md:p-6 lg:p-8'
          )}
        >
          {children}
        </main>
      </div>

      {/* ── Mobile bottom nav. Phone cashier keeps it so staff can leave POS. ─ */}
      <nav className={clsx(
        'app-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-white px-2 pb-safe pt-1 md:hidden transition-transform duration-200',
        isCashier && !cashierPhone && 'hidden'
      )}>
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
          {mobileNavigation.map((item) => {
            const isActive = isNavActive(item.href, pathname);
            return (
              <SidebarLink
                key={`mobile-${item.name}`}
                href={item.href}
                isActive={isActive}
                className={clsx(
                  'flex min-h-[56px] flex-col items-center justify-center rounded-lg px-1 py-1.5 text-[11px] font-medium transition-colors',
                  isActive ? 'text-indigo-700 bg-indigo-50' : 'text-slate-600 hover:bg-indigo-50/70'
                )}
              >
                <item.icon className={clsx('mb-0.5 h-4 w-4', isActive ? 'text-indigo-600' : 'text-slate-500')} />
                <span className="truncate max-w-full">{item.name}</span>
              </SidebarLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
