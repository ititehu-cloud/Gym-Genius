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
    <div className={cn("flex items-center gap-4 font-headline text-3xl md:text-4xl font-black group-data-[collapsible=icon]:justify-center", className)}>
      {iconUrl ? (
        <Avatar className="h-16 w-16 md:h-20 md:w-20 border-4 border-white/20 shadow-xl shrink-0">
          <AvatarImage src={iconUrl} alt={displayName || 'Gym Logo'} className="object-contain p-1.5 bg-white" />
          <AvatarFallback className="bg-white text-primary text-xl font-black">
            {displayName?.charAt(0).toUpperCase() || 'G'}
          </AvatarFallback>
        </Avatar>
      ) : (
        <Dumbbell className="h-12 w-12 md:h-16 md:w-16 shrink-0" />
      )}
      <span className="group-data-[collapsible=icon]:hidden truncate max-w-[280px] md:max-w-[500px] tracking-tighter uppercase">
        {displayName || 'Gym Genius'}
      </span>
    </div>
  );
}
