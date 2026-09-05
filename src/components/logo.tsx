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
    <div className={cn("flex items-center gap-3 font-headline text-2xl md:text-3xl font-black group-data-[collapsible=icon]:justify-center", className)}>
      {iconUrl ? (
        <Avatar className="h-10 w-10 md:h-14 md:w-14 border-2 border-white/20 shadow-lg shrink-0">
          <AvatarImage src={iconUrl} alt={displayName || 'Gym Logo'} className="object-contain p-1 bg-white" />
          <AvatarFallback className="bg-white text-primary text-sm font-black">
            {displayName?.charAt(0).toUpperCase() || 'G'}
          </AvatarFallback>
        </Avatar>
      ) : (
        <Dumbbell className="h-8 w-8 md:h-10 md:w-10 shrink-0" />
      )}
      <span className="group-data-[collapsible=icon]:hidden truncate max-w-[200px] md:max-w-[400px] tracking-tight uppercase">
        {displayName || 'Gym Genius'}
      </span>
    </div>
  );
}
