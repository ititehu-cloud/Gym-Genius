'use client';

import * as React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/sidebar-nav";
import { Logo } from "@/components/logo";
import { UserProfile } from "@/lib/types";

export function AppSidebar({ userProfile, ...props }: React.ComponentProps<typeof Sidebar> & { userProfile?: UserProfile | null }) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="h-20 border-b border-sidebar-border bg-sidebar flex items-center px-6">
        <Logo 
          displayName={userProfile?.displayName} 
          iconUrl={userProfile?.icon} 
          className="text-primary" 
        />
      </SidebarHeader>
      <SidebarContent>
        <div className="py-4 px-2">
            <SidebarNav />
        </div>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 px-2">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">
                {userProfile?.displayName?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="flex flex-col truncate group-data-[collapsible=icon]:hidden">
                <span className="text-sm font-bold truncate">{userProfile?.displayName || 'User'}</span>
                <span className="text-[10px] text-muted-foreground truncate">{userProfile?.email || ''}</span>
            </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
