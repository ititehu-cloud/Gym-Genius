import { Dumbbell } from 'lucide-react';

export function Logo() {
  return (
    <div className="flex items-center gap-2 font-headline text-lg font-bold text-primary group-data-[collapsible=icon]:justify-center">
      <Dumbbell className="h-6 w-6 shrink-0" />
      <span className="group-data-[collapsible=icon]:hidden">Gym Genius</span>
    </div>
  );
}
