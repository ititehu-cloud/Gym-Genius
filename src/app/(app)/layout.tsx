'use client';

import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { redirect } from "next/navigation";
import { signOut } from "firebase/auth";
import { doc } from "firebase/firestore";
import { Header } from "@/components/header";
import { LoaderCircle } from "lucide-react";
import type { UserProfile as UserProfileType } from "@/lib/types";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

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
  
  const displayName = userProfile?.displayName || user.email;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/30">
        <AppSidebar userProfile={userProfile} />
        <SidebarInset className="flex flex-col flex-1 min-w-0">
          <Header 
            displayName={displayName} 
            iconUrl={userProfile?.icon} 
            onLogout={handleLogout} 
          />
          <main className="flex-1 overflow-y-auto">
              {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
