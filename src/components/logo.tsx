import { Dumbbell } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function Logo({ 
  displayName, 
  iconUrl, 
  className 
}: { 
  displayName?: string | null; 
  iconUrl?: string | null; 
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2 font-headline text-lg font-bold group-data-[collapsible=icon]:justify-center", className)}>
      {iconUrl ? (
        <Avatar className="h-9 w-9 border-2 border-white/20 shadow-sm shrink-0">
          <AvatarImage src={iconUrl} alt={displayName || 'Gym Logo'} className="object-contain p-1 bg-white" />
          <AvatarFallback className="bg-white text-primary text-xs font-black">
            {displayName?.charAt(0).toUpperCase() || 'G'}
          </AvatarFallback>
        </Avatar>
      ) : (
        <Dumbbell className="h-6 w-6 shrink-0" />
      )}
      <span className="group-data-[collapsible=icon]:hidden truncate max-w-[180px]">
        {displayName || 'Gym Genius'}
      </span>
    </div>
  );
}
