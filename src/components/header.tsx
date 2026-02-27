'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
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
    </header>
  );
}
