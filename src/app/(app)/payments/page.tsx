'use client';

import { LoaderCircle } from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, query, orderBy, doc } from "firebase/firestore";
import type { Member, Payment, Plan } from "@/lib/types";
import { useMemo, useState, Suspense } from "react";
import { Input } from "@/components/ui/input";
import PaymentStatusCard from "@/components/payments/payment-status-card";
import { useSearchParams } from "next/navigation";
import { isSameDay, parseISO } from "date-fns";

function PaymentsList() {
  const firestore = useFirestore();
  const [searchQuery, setSearchQuery] = useState("");
  const { user, isUserLoading: isAuthLoading } = useUser();

  const searchParams = useSearchParams();
  const dateFilter = searchParams.get('date');
  const statusFilter = searchParams.get('status');

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userDocRef);

  const paymentsQuery = useMemoFirebase(() => query(collection(firestore, "payments"), orderBy("paymentDate", "desc")), [firestore]);
  const { data: payments, isLoading: isLoadingPayments } = useCollection<Payment>(paymentsQuery);
  
  const { data: members, isLoading: isLoadingMembers } = useCollection<Member>(
      useMemoFirebase(() => collection(firestore, "members"), [firestore])
  );

  const { data: plans, isLoading: isLoadingPlans } = useCollection<Plan>(
      useMemoFirebase(() => collection(firestore, "plans"), [firestore])
  );

  const planMap = useMemo(() => {
    if (!plans) return new Map<string, Plan>();
    return new Map(plans.map(p => [p.id, p]));
  }, [plans]);

  const paymentsByMember = useMemo(() => {
    if (!payments) return new Map<string, Payment[]>();
    return payments.reduce((acc, payment) => {
        const memberPayments = acc.get(payment.memberId) || [];
        memberPayments.push(payment);
        acc.set(payment.memberId, memberPayments);
        return acc;
    }, new Map<string, Payment[]>());
  }, [payments]);

  const filteredMembers = useMemo(() => {
    if (!members || !payments) return [];

    let tempMembers = [...members];
    const today = new Date();

    if (dateFilter || statusFilter) {
        const memberIdsWithMatchingPayments = new Set<string>();

        payments.forEach(payment => {
            let dateMatch = true;
            if (dateFilter === 'today') {
                dateMatch = isSameDay(parseISO(payment.paymentDate), today);
            }

            let statusMatch = true;
            if (statusFilter) {
                statusMatch = payment.status === (statusFilter as Payment['status']);
            }

            if (dateMatch && statusMatch) {
                memberIdsWithMatchingPayments.add(payment.memberId);
            }
        });
        tempMembers = tempMembers.filter(member => memberIdsWithMatchingPayments.has(member.id));
    }

    if (searchQuery) {
        const lowercasedQuery = searchQuery.toLowerCase();
        tempMembers = tempMembers.filter(m => 
            m.name.toLowerCase().includes(lowercasedQuery) ||
            m.memberId.toLowerCase().includes(lowercasedQuery) ||
            m.mobileNumber.includes(searchQuery)
        );
    }
    return tempMembers;
  }, [members, payments, searchQuery, dateFilter, statusFilter]);

  const isLoading = isLoadingPayments || isLoadingMembers || isLoadingPlans || isAuthLoading || (!!user && isProfileLoading);
  
  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  const gymName = userProfile?.displayName || user?.email;
  const gymAddress = userProfile?.displayAddress;
  const gymIconUrl = userProfile?.icon;
  
  const showHistoryInitially = dateFilter === 'today';

  return (
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <h1 className="text-2xl font-headline font-semibold">
            {dateFilter === 'today' && statusFilter === 'paid' ? "Today's Collections" : "Member Payments"}
          </h1>
          <div className="flex items-center gap-2 w-full md:w-auto">
              <Input
                  placeholder="Search by name, ID, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-64"
              />
          </div>
        </div>

        {filteredMembers && filteredMembers.length > 0 ? (
            <div className="space-y-6">
                {filteredMembers.map(member => {
                    const memberPlan = planMap.get(member.planId);
                    const memberPayments = paymentsByMember.get(member.id) || [];
                    if (!memberPlan) return null; // Don't render card if member has no valid plan
                    return (
                        <PaymentStatusCard 
                            key={member.id}
                            member={member}
                            plan={memberPlan}
                            payments={memberPayments}
                            allMembers={members || []}
                            gymName={gymName}
                            gymAddress={gymAddress}
                            gymIconUrl={gymIconUrl}
                            showHistoryInitially={showHistoryInitially}
                            filterHistoryByDate={dateFilter}
                        />
                    )
                })}
            </div>
        ) : (
             <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm py-12 mt-4">
                <div className="text-center">
                    <h3 className="text-2xl font-bold tracking-tight">
                        {dateFilter || statusFilter ? 'No payments found' : 'No members found'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        {searchQuery || dateFilter || statusFilter ? "Your filter returned no results." : "Add members in the 'Members' section to see them here."}
                    </p>
                </div>
            </div>
        )}
      </main>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense fallback={<div className="flex flex-1 items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin text-primary" /></div>}>
      <PaymentsList />
    </Suspense>
  )
}
