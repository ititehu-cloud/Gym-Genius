'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CreditCard, LayoutDashboard, Tags, Users, ClipboardCheck, LogOut, User, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { User as FirebaseUser } from 'firebase/auth';
import type { UserProfile as UserProfileType } from '@/lib/types';


const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/members', icon: Users, label: 'Members' },
  { href: '/attendance', icon: ClipboardCheck, label: 'Attendance' },
  { href: '/payments', icon: CreditCard, label: 'Payments' },
  { href: '/plans', icon: Tags, label: 'Plans' },
];

type BottomNavigationProps = {
    user: FirebaseUser | null;
    userProfile: UserProfileType | null;
    onLogout: () => void;
}

export function BottomNavigation({ user, userProfile, onLogout }: BottomNavigationProps) {
  const pathname = usePathname();
  
  const displayName = userProfile?.displayName || user?.email;

  const extendedNavItems = [
      ...navItems,
      { href: '/transactions', icon: BookOpen, label: 'Passbook' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-primary/20 bg-primary text-primary-foreground">
      <div className="flex h-20 items-stretch justify-around">
        {extendedNavItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 p-2 text-xs font-medium transition-colors w-full',
                isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div className={cn(
                    "flex flex-col items-center justify-center gap-1 p-2 text-xs font-medium transition-colors w-full cursor-pointer",
                    "text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
                )}>
                    <User className="h-5 w-5" />
                    <span>Profile</span>
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 mb-2" align="end" side="top" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <p className="text-sm font-medium">{displayName}</p>
                    {user?.email && <p className="text-xs text-muted-foreground">{user.email}</p>}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
