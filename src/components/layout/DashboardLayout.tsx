'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
} from 'lucide-react';
import clsx from 'clsx';
import { CashierChromeProvider, useCashierChrome } from '@/components/cashier/CashierChromeContext';

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

  const initials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`;
  const role = user?.role as NavigationRole | undefined;
  const isCashier = pathname === '/dashboard/cashier';
  const { chrome, setChrome } = useCashierChrome();
  const cashierPhone = isCashier && chrome === 'phone';
  const allowedNavigation = navigation.filter(item => !item.roles || (role ? item.roles.includes(role) : false));
  const mobileNavigation = allowedNavigation.filter(item =>
    ['/dashboard/cashier', '/dashboard/bookings', '/dashboard/rentals', '/dashboard/items', '/dashboard/sales'].includes(item.href)
  );
  const activePage = navigation.find(item =>
    item.href === pathname || (item.href !== '/dashboard' && pathname?.startsWith(item.href))
  );

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
                  const isActive = item.href === pathname || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={clsx(
                        'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors touch-manipulation',
                        isActive
                          ? 'bg-white/70 text-slate-900 ring-1 ring-black/5 shadow-sm'
                          : 'text-slate-600 hover:bg-white/40 hover:text-slate-900'
                      )}
                    >
                      <item.icon
                        className={clsx(
                          'h-4 w-4 shrink-0 transition-colors',
                          isActive ? 'text-indigo-600' : 'text-slate-500 group-hover:text-slate-700'
                        )}
                      />
                      {item.name}
                    </Link>
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
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-black/5 bg-white/40 px-3 backdrop-blur-xl sm:gap-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className={clsx(
                '-ml-1 flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 hover:bg-white/50 touch-manipulation',
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
            <div className="flex rounded-full bg-white/70 p-0.5 ring-1 ring-black/5">
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
                <select
                  id="branch-switcher"
                  value={viewingAll ? ALL_BRANCHES_ID : (currentBranchId || '')}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCurrentBranchId(value === ALL_BRANCHES_ID ? null : value);
                  }}
                  className="max-w-[9.5rem] rounded-full bg-white/70 py-1.5 pl-3 pr-7 text-xs font-semibold text-slate-800 ring-1 ring-black/5 sm:max-w-[12rem]"
                >
                  {user?.role === 'admin' && <option value={ALL_BRANCHES_ID}>All branches</option>}
                  {allowedBranches.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </div>
            ) : currentBranch ? (
              <div className="flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-800 ring-1 ring-black/5">
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
        'fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-white/45 px-2 pb-safe pt-1 backdrop-blur-xl md:hidden',
        isCashier && !cashierPhone && 'hidden'
      )}>
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
          {mobileNavigation.map((item) => {
            const isActive = item.href === pathname || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
            return (
              <Link
                key={`mobile-${item.name}`}
                href={item.href}
                className={clsx(
                  'flex min-h-[56px] flex-col items-center justify-center rounded-lg px-1 py-1.5 text-[11px] font-medium transition-colors',
                  isActive ? 'text-indigo-700 bg-white/70 ring-1 ring-black/5' : 'text-slate-600 hover:bg-white/50'
                )}
              >
                <item.icon className={clsx('mb-0.5 h-4 w-4', isActive ? 'text-indigo-600' : 'text-slate-500')} />
                <span className="truncate max-w-full">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
