import MemberCard from "@/components/members/member-card";
import { Button } from "@/components/ui/button";
import { members } from "@/lib/data";
import { PlusCircle } from "lucide-react";

export default function MembersPage() {
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-headline font-semibold">Members</h1>
        <Button>
          <PlusCircle />
          Add Member
        </Button>
      </div>
      <div className="grid gap-4 md:gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {members.map((member) => (
          <MemberCard key={member.id} member={member} />
        ))}
      </div>
    </main>
  );
}
