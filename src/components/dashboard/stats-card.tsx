'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import Link from 'next/link';

type StatsCardProps = {
  title: string;
  value: string | number;
  icon: LucideIcon;
  className?: string;
  href?: string;
};

export default function StatsCard({ title, value, icon: Icon, className, href }: StatsCardProps) {
  const cardContent = (
    <Card className={cn("rounded-2xl shadow-sm transition-all hover:shadow-md", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            <Icon className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-3xl font-bold">{value}</div>
        </CardContent>
    </Card>
  );

  if (href) {
    return (
        <Link href={href} className="block">
            {cardContent}
        </Link>
    )
  }

  return cardContent;
}
