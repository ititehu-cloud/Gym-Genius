import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatsCardProps = {
  title: string;
  value: string | number;
  className?: string;
};

export default function StatsCard({ title, value, className }: StatsCardProps) {
  return (
    <Card className={cn("p-6 flex flex-col items-center justify-center gap-2", className)}>
        <div className="text-5xl font-bold">{value}</div>
        <div className="text-base font-medium">{title}</div>
    </Card>
  );
}
