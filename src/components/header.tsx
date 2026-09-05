
'use client';

import { Button } from "@/components/ui/button";
import { LogOut, CalendarClock } from "lucide-react";
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
import { Logo } from "@/components/logo";
import Link from "next/link";
import { format, parseISO } from "date-fns";

type HeaderProps = {
    displayName?: string | null;
    iconUrl?: string | null;
    validity?: string | null;
    onLogout: () => void;
}

export function Header({ displayName, iconUrl, validity, onLogout }: HeaderProps) {
  return (
    <header className="flex h-28 md:h-32 shrink-0 items-center justify-between gap-4 border-b bg-primary px-6 text-primary-foreground shadow-lg sm:px-8 sticky top-0 z-30">
        <div className="flex flex-col">
            <Link href="/dashboard" className="flex flex-col">
                <Logo 
                  displayName={displayName} 
                  iconUrl={iconUrl} 
                  className="text-primary-foreground" 
                />
                {validity && (
                    <div className="flex items-center gap-1.5 mt-1 ml-[72px] md:ml-[96px] opacity-80">
                        <CalendarClock className="h-3 w-3" />
                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest">
                            Validity: {format(parseISO(validity), 'dd MMM yyyy')}
                        </span>
                    </div>
                )}
            </Link>
        </div>
        
        <div className="flex items-center gap-2">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button 
                        variant="ghost" 
                        size="lg" 
                        className="text-primary-foreground hover:bg-primary-foreground/10 flex items-center gap-3 h-14 px-6 text-lg font-bold"
                    >
                        <LogOut className="h-6 w-6" />
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
