'use client';

import MemberCard from "@/components/members/member-card";
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { LoaderCircle } from "lucide-react";
import AddMemberDialog from "@/components/members/add-member-dialog";
import type { Member, Plan } from "@/lib/types";
import { useMemo, useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isSameDay, parseISO } from "date-fns";

function MemberList() {
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
  
  const searchParams = useSearchParams();
  const statusParam = searchParams.get('status') as Member['status'] | null;
  const expiryParam = searchParams.get('expiry');

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Member['status'] | "all">("all");

  useEffect(() => {
    if (statusParam) {
      setStatusFilter(statusParam);
    }
  }, [statusParam]);

  const planMap = useMemo(() => {
    if (!plans) return new Map();
    return new Map(plans.map(p => [p.id, p.name]));
  }, [plans]);

  const filteredMembers = useMemo(() => {
    if (!members) return [];
    let filtered = [...members];
    
    if (statusFilter !== 'all') {
        filtered = filtered.filter(m => m.status === statusFilter);
    }

    if (expiryParam === 'today') {
        // Reset status filter if expiry is the main filter
        if (statusFilter !== 'all') setStatusFilter('all');
        filtered = members.filter(m => isSameDay(parseISO(m.expiryDate), new Date()));
    }

    if (searchQuery) {
        filtered = filtered.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    return filtered;
  }, [members, searchQuery, statusFilter, expiryParam]);

  const isLoading = isLoadingMembers || isLoadingPlans || isAuthLoading || (!!user && isProfileLoading);

  const gymName = userProfile?.displayName || user?.email;
  const gymAddress = userProfile?.address;

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-headline font-semibold">Members</h1>
        <div className="flex items-center gap-2">
            <Input
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
            />
            <Select value={statusFilter} onValueChange={(value: Member['status'] | "all") => {
              // Cannot have both expiry and status filter, so we clear the URL
              if (expiryParam) window.history.replaceState(null, '', '/members');
              setStatusFilter(value)
            }}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="due">Due</SelectItem>
                </SelectContent>
            </Select>
            <AddMemberDialog />
        </div>
      </div>
      {filteredMembers && filteredMembers.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:gap-8">
          {filteredMembers.map((member) => (
            <MemberCard key={member.id} member={member} planName={planMap.get(member.planId) || "N/A"} gymName={gymName} gymAddress={gymAddress} />
          ))}
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm py-12">
            <div className="text-center">
                <h3 className="text-2xl font-bold tracking-tight">No members found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchQuery || statusFilter !== 'all' || expiryParam ? "Your filter returned no results." : "Get started by adding a new member."}
                </p>
                <AddMemberDialog />
            </div>
        </div>
      )}
    </main>
  );
}

export default function MembersPage() {
  return (
    <Suspense fallback={<div className="flex flex-1 items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin text-primary" /></div>}>
      <MemberList />
    </Suspense>
  )
}
