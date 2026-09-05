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
    <div className={cn("flex items-center gap-3 font-headline text-2xl md:text-3xl font-black group-data-[collapsible=icon]:justify-center shrink-0", className)}>
      {iconUrl ? (
        <Avatar className="h-10 w-10 md:h-14 md:w-14 border-2 border-white/20 shadow-lg shrink-0">
          <AvatarImage src={iconUrl} alt={displayName || 'Gym Logo'} className="object-contain p-1 bg-white" />
          <AvatarFallback className="bg-white text-primary text-sm font-black">
            {displayName?.charAt(0).toUpperCase() || 'G'}
          </AvatarFallback>
        </Avatar>
      ) : (
        <Dumbbell className="h-10 w-10 md:h-12 md:w-12 shrink-0" />
      )}
      <span className="group-data-[collapsible=icon]:hidden whitespace-nowrap tracking-wider uppercase">
        {displayName || 'Gym Genius'}
      </span>
    </div>
  );
}
