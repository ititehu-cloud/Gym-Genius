'use client';

import { SidebarTrigger } from "@/components/ui/sidebar";
import { useSidebar } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type HeaderProps = {
    displayName?: string | null;
    iconUrl?: string | null;
}

export function Header({ displayName, iconUrl }: HeaderProps) {
  const { isMobile } = useSidebar();
  const userInitial = displayName ? displayName.charAt(0).toUpperCase() : '?';
  
  return (
    <header className="flex h-20 shrink-0 items-center gap-4 border-b bg-primary px-4 text-primary-foreground shadow-md sm:px-6">
        {isMobile && <SidebarTrigger className="text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground" />}
        {iconUrl && (
          <Avatar className="h-12 w-12">
            <AvatarImage src={iconUrl} alt={displayName || 'Gym Logo'} />
            <AvatarFallback>{userInitial}</AvatarFallback>
          </Avatar>
        )}
        <h1 className="text-2xl font-bold tracking-tight">{displayName || 'Dashboard'}</h1>
    </header>
  );
}
