'use client';

import { Button } from "@/components/ui/button";
import { LogOut, CalendarClock, ShieldCheck } from "lucide-react";
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
import { format, parseISO, isValid } from "date-fns";
import { useMemo } from "react";

type HeaderProps = {
    displayName?: string | null;
    iconUrl?: string | null;
    validity?: any;
    onLogout: () => void;
}

export function Header({ displayName, iconUrl, validity, onLogout }: HeaderProps) {
  const displayValidity = useMemo(() => {
    if (!validity) return null;
    
    // Handle "lifetime" string explicitly
    if (typeof validity === 'string' && validity.toLowerCase() === 'lifetime') {
      return 'LIFETIME ACCESS';
    }
    
    try {
        let date: Date;
        // Handle Firestore Timestamp, ISO string, or Date object
        if (typeof validity === 'string') {
            date = parseISO(validity);
        } else if (validity && typeof validity.toDate === 'function') {
            date = validity.toDate();
        } else {
            date = new Date(validity);
        }

        if (isValid(date)) {
            return format(date, 'dd MMM yyyy');
        }
        return null;
    } catch (e) {
        return null;
    }
  }, [validity]);

  const isLifetime = displayValidity === 'LIFETIME ACCESS';

  return (
    <header className="flex h-20 shrink-0 items-center justify-between gap-4 border-b bg-primary px-4 text-primary-foreground shadow-lg sm:px-6 sticky top-0 z-30">
        <div className="flex flex-col justify-center overflow-hidden">
            <Link href="/dashboard" className="flex flex-col gap-0.5 group">
                <Logo 
                  displayName={displayName} 
                  iconUrl={iconUrl} 
                  className="text-primary-foreground transition-transform group-hover:scale-[1.01] scale-90 -ml-2 origin-left" 
                />
                
                {displayValidity && (
                    <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-md px-2 py-0.5 rounded-full w-fit border border-white/10 shadow-xl ml-9 animate-in fade-in slide-in-from-left-2 duration-500">
                        {isLifetime ? (
                            <ShieldCheck className="h-3 w-3 text-green-400 shrink-0" />
                        ) : (
                            <CalendarClock className="h-3 w-3 text-amber-400 shrink-0" />
                        )}
                        <span className="text-[9px] font-black uppercase tracking-wider text-white whitespace-nowrap">
                            <span className="opacity-70 mr-1">License Validity Till:</span>
                            <span className={isLifetime ? "text-green-400" : "text-amber-400"}>
                                {displayValidity}
                            </span>
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
                        size="sm" 
                        className="text-primary-foreground hover:bg-white/10 flex items-center gap-2 h-10 px-3 text-xs font-bold border border-transparent hover:border-white/20 transition-all"
                    >
                        <LogOut className="h-4 w-4" />
                        <span className="hidden sm:inline">Sign Out</span>
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
