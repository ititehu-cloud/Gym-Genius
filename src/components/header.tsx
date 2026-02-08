'use client';

import { SidebarTrigger } from "@/components/ui/sidebar";
import { useSidebar } from "@/components/ui/sidebar";

type HeaderProps = {
    displayName?: string | null;
}

export function Header({ displayName }: HeaderProps) {
  const { isMobile } = useSidebar();
  
  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b bg-primary px-4 text-primary-foreground shadow-md sm:px-6">
        {isMobile && <SidebarTrigger className="text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground" />}
        <h1 className="text-xl font-bold tracking-tight">{displayName || 'Dashboard'}</h1>
    </header>
  );
}
