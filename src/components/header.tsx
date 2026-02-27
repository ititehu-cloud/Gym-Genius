'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

type HeaderProps = {
    displayName?: string | null;
    iconUrl?: string | null;
    onLogout: () => void;
}

export function Header({ displayName, iconUrl, onLogout }: HeaderProps) {
  const userInitial = displayName ? displayName.charAt(0).toUpperCase() : '?';
  
  return (
    <header className="flex h-20 shrink-0 items-center justify-between gap-4 border-b bg-primary px-4 text-primary-foreground shadow-md sm:px-6">
        <div className="flex items-center gap-4">
            {iconUrl && (
              <Avatar className="h-12 w-12">
                <AvatarImage src={iconUrl} alt={displayName || 'Gym Logo'} />
                <AvatarFallback>{userInitial}</AvatarFallback>
              </Avatar>
            )}
            <h1 className="text-2xl font-bold tracking-tight">{displayName || 'Dashboard'}</h1>
        </div>
        <Button 
            variant="ghost" 
            size="sm" 
            onClick={onLogout}
            className="text-primary-foreground hover:bg-primary-foreground/10 flex items-center gap-2"
        >
            <LogOut className="h-5 w-5" />
            <span className="hidden sm:inline">Sign Out</span>
        </Button>
    </header>
  );
}
