
'use client';

import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { redirect } from "next/navigation";
import { signOut } from "firebase/auth";
import { doc } from "firebase/firestore";
import { Header } from "@/components/header";
import { LoaderCircle, ShieldAlert, KeyRound } from "lucide-react";
import type { UserProfile as UserProfileType } from "@/lib/types";
import { BottomNavigation } from "@/components/bottom-navigation";
import { useMemo } from "react";
import { parseISO, isBefore, startOfDay } from "date-fns";
import { Button } from "@/components/ui/button";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading: isAuthLoading } = useUser();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfileType>(userDocRef);
  
  const isUserLoading = isAuthLoading || (!!user && isProfileLoading);

  const isExpired = useMemo(() => {
    if (!userProfile?.validity) return false;
    try {
      const validityDate = startOfDay(parseISO(userProfile.validity));
      const today = startOfDay(new Date());
      return isBefore(validityDate, today);
    } catch (e) {
      return false;
    }
  }, [userProfile]);

  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <LoaderCircle className="animate-spin h-12 w-12 text-primary" />
      </div>
    );
  }

  if (!user) {
    return redirect('/login');
  }

  const handleLogout = () => {
    signOut(auth);
  };

  if (isExpired) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
        <div className="h-24 w-24 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
            <ShieldAlert className="h-12 w-12 text-destructive" />
        </div>
        <h1 className="text-3xl font-black uppercase tracking-tighter mb-2 text-destructive">Validity Expired</h1>
        <p className="text-muted-foreground max-w-md text-lg font-medium leading-relaxed mb-8">
            Your gym dashboard license has expired. Please renew the license message to continue managing your gym.
        </p>
        <div className="flex flex-col gap-4 w-full max-w-sm">
            <Button size="lg" className="h-14 text-lg font-bold gap-2" variant="default">
                <KeyRound className="h-5 w-5" />
                Renew License Now
            </Button>
            <Button variant="ghost" onClick={handleLogout} className="font-bold text-muted-foreground">
                Sign Out
            </Button>
        </div>
        <p className="mt-12 text-xs text-muted-foreground font-mono uppercase tracking-widest">
            License ID: {userProfile?.id}
        </p>
      </div>
    );
  }
  
  const displayName = userProfile?.displayName || user.email;

  return (
    <div className="flex min-h-screen flex-col bg-muted/30 pb-20">
      <Header 
        displayName={displayName} 
        iconUrl={userProfile?.icon} 
        validity={userProfile?.validity}
        onLogout={handleLogout} 
      />
      <main className="flex-1 overflow-y-auto">
          {children}
      </main>
      <BottomNavigation user={user} userProfile={userProfile} />
    </div>
  );
}
