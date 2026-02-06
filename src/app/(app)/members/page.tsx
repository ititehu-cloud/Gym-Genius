'use client';

import MemberCard from "@/components/members/member-card";
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { LoaderCircle } from "lucide-react";
import AddMemberDialog from "@/components/members/add-member-dialog";
import type { Member, Plan } from "@/lib/types";
import { useMemo } from "react";

export default function MembersPage() {
  const firestore = useFirestore();
  const { user, isUserLoading: isAuthLoading } = useUser();

  const membersRef = useMemoFirebase(() => collection(firestore, "members"), [firestore]);
  const { data: members, isLoading: isLoadingMembers } = useCollection<Member>(membersRef);

  const plansRef = useMemoFirebase(() => collection(firestore, "plans"), [firestore]);
  const { data: plans, isLoading: isLoadingPlans } = useCollection<Plan>(plansRef);
  
  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userDocRef);

  const isLoading = isLoadingMembers || isLoadingPlans || isAuthLoading || (!!user && isProfileLoading);

  const planMap = useMemo(() => {
    if (!plans) return new Map();
    return new Map(plans.map(p => [p.id, p.name]));
  }, [plans]);

  const gymName = userProfile?.displayName || user?.email;

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-headline font-semibold">Members</h1>
        <AddMemberDialog />
      </div>
      {members && members.length > 0 ? (
        <div className="grid gap-4 md:gap-8 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {members.map((member) => (
            <MemberCard key={member.id} member={member} planName={planMap.get(member.planId) || "N/A"} gymName={gymName} />
          ))}
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm py-12">
            <div className="text-center">
                <h3 className="text-2xl font-bold tracking-tight">No members found</h3>
                <p className="text-sm text-muted-foreground mb-4">Get started by adding a new member.</p>
                <AddMemberDialog />
            </div>
        </div>
      )}
    </main>
  );
}
