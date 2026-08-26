"use client";

import { CreditCard, LayoutDashboard, Tags, Users, ClipboardCheck, BookOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "./ui/sidebar";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/members", icon: Users, label: "Members" },
  { href: "/attendance", icon: ClipboardCheck, label: "Attendance" },
  { href: "/payments", icon: CreditCard, label: "Payments" },
  { href: "/plans", icon: Tags, label: "Plans" },
  { href: "/transactions", icon: BookOpen, label: "Passbook" },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <SidebarMenu className="gap-2">
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
        
        return (
          <SidebarMenuItem key={item.href}>
            <Link href={item.href} className="w-full">
              <SidebarMenuButton
                isActive={isActive}
                tooltip={item.label}
                className={cn(
                    "h-11 px-4 transition-all duration-200 border border-transparent",
                    isActive 
                        ? "bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-md border-primary/20" 
                        : "hover:bg-primary/10 hover:text-primary"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                <span className="text-sm tracking-tight">{item.label}</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
