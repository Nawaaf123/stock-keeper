import { Package, BarChart3, FileText, History, ShoppingCart, Users, ClipboardList, CreditCard, Menu, X, LogOut, UserCog } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import mrfogLogo from '@/assets/mrfog-logo.png';
import { useAuth } from '@/hooks/useAuth';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

const navItems = [
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'orders', label: 'Orders', icon: ShoppingCart },
  { id: 'stock-summary', label: 'Stock Summary', icon: ClipboardList },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'wholesalers', label: 'Wholesalers', icon: Users },
  { id: 'inventory-history', label: 'Inventory History', icon: History },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'bill-of-lading', label: 'Bill of Lading', icon: FileText },
  { id: 'users', label: 'Users', icon: UserCog },
];

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();

  // Close drawer when view changes
  useEffect(() => { setMobileOpen(false); }, [activeView]);

  // Lock scroll while drawer is open
  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const activeLabel = navItems.find(n => n.id === activeView)?.label ?? 'Nawaaf Track';

  const NavList = () => (
    <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onViewChange(item.id)}
          className={cn(
            'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 min-h-[44px]',
            activeView === item.id
              ? 'bg-sidebar-accent text-sidebar-primary'
              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground active:bg-sidebar-accent/70'
          )}
        >
          <item.icon className="w-5 h-5 flex-shrink-0" />
          <span className="truncate">{item.label}</span>
        </button>
      ))}
    </nav>
  );

  return (
    <>
      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 bg-sidebar text-sidebar-foreground flex items-center px-3 gap-3 border-b border-sidebar-border" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 -ml-1 rounded-md hover:bg-sidebar-accent/50 active:bg-sidebar-accent min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center flex-shrink-0 overflow-hidden">
            <img src={mrfogLogo} alt="MR Fog" className="w-7 h-7 object-contain" />
          </div>
          <h1 className="font-semibold text-base truncate">{activeLabel}</h1>
        </div>
      </header>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/60"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — desktop fixed, mobile slide-in drawer */}
      <aside
        className={cn(
          'bg-sidebar text-sidebar-foreground flex flex-col h-screen fixed left-0 top-0 z-50 transition-transform duration-300 ease-out',
          'w-72 lg:w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="p-4 lg:p-6 border-b border-sidebar-border flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center flex-shrink-0 overflow-hidden">
              <img src={mrfogLogo} alt="MR Fog" className="w-9 h-9 object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="font-semibold text-lg truncate">Nawaaf Track</h1>
              <p className="text-xs text-sidebar-foreground/60 truncate">MR Fog Inventory</p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-2 rounded-md hover:bg-sidebar-accent/50 min-w-[40px] min-h-[40px] flex items-center justify-center"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <NavList />

        <div className="p-3 border-t border-sidebar-border space-y-1" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          {user && (
            <div className="px-4 py-2 text-xs text-sidebar-foreground/60 truncate" title={user.email ?? ''}>
              {user.email}
            </div>
          )}
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all duration-200 min-h-[44px]"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
