'use client';

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from 'next/link';

type StatsCardProps = {
  title: string;
  value: string | number;
  className?: string;
  href?: string;
  valueClassName?: string;
};

export default function StatsCard({ title, value, className, href, valueClassName }: StatsCardProps) {
  const cardContent = (
    <Card className={cn("rounded-xl shadow-sm transition-all hover:shadow-md", className)}>
        <CardContent className="p-4 flex flex-col items-center justify-center h-28 gap-1">
            <div className={cn("text-4xl font-bold", valueClassName)}>
                {value}
            </div>
            <p className={cn("text-sm font-medium", valueClassName ? valueClassName : 'text-muted-foreground', 'opacity-90')}>{title}</p>
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
