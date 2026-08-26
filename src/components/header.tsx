'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type HeaderProps = {
    displayName?: string | null;
    iconUrl?: string | null;
    onLogout: () => void;
}

export function Header({ displayName, iconUrl, onLogout }: HeaderProps) {
  const userInitial = displayName ? displayName.charAt(0).toUpperCase() : '?';
  
  return (
    <header className="flex h-20 shrink-0 items-center justify-between gap-4 border-b bg-primary px-4 text-primary-foreground shadow-md sm:px-6 sticky top-0 z-30">
        <div className="flex items-center gap-4">
            <SidebarTrigger className="text-primary-foreground hover:bg-white/10" />
            <div className="flex items-center gap-3">
                {iconUrl && (
                  <Avatar className="h-10 w-10 border-2 border-white/20 hidden sm:flex">
                    <AvatarImage src={iconUrl} alt={displayName || 'Gym Logo'} className="object-contain p-1 bg-white" />
                    <AvatarFallback>{userInitial}</AvatarFallback>
                  </Avatar>
                )}
                <h1 className="text-xl font-bold tracking-tight line-clamp-1">{displayName || 'Dashboard'}</h1>
            </div>
        </div>
        
        <div className="flex items-center gap-2">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-primary-foreground hover:bg-primary-foreground/10 flex items-center gap-2"
                    >
                        <LogOut className="h-5 w-5" />
                        <span className="hidden md:inline">Sign Out</span>
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to sign out?</AlertDialogTitle>
                        <AlertDialogDescription>
                            You will need to enter your email and password again to access your gym dashboard.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={onLogout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Sign Out
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    </header>
  );
}
