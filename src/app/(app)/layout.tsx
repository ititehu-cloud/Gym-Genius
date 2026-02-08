'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarInset, SidebarTrigger, SidebarSeparator } from "@/components/ui/sidebar";
import { LogOut, LoaderCircle } from "lucide-react";
import { Logo } from "@/components/logo";
import { SidebarNav } from "@/components/sidebar-nav";
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { redirect } from "next/navigation";
import { signOut } from "firebase/auth";
import { doc } from "firebase/firestore";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading: isAuthLoading } = useUser();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userDocRef);
  
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
  const userInitial = displayName ? displayName.charAt(0).toUpperCase() : '?';

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Logo displayName={displayName} />
        </SidebarHeader>
        <SidebarContent>
          {/* Page content takes up the space, pushing footer down */}
        </SidebarContent>
        <SidebarFooter>
          <div className="p-2">
            <SidebarNav />
          </div>
          <SidebarSeparator />
          <div className="p-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start gap-2 h-12 group-data-[collapsible=icon]:w-12 group-data-[collapsible=icon]:justify-center">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.photoURL ?? undefined} alt={displayName ?? 'User'} />
                    <AvatarFallback>{userInitial}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start group-data-[collapsible=icon]:hidden">
                    <span className="font-medium text-sm">{displayName}</span>
                    {user.email && <span className="text-xs text-muted-foreground">{user.email}</span>}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-medium">{displayName}</p>
                  {user.email && <p className="text-xs text-muted-foreground">{user.email}</p>}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 sm:px-6 sticky top-0 z-30 md:hidden">
          <SidebarTrigger />
          <Logo displayName={displayName} />
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
