'use client';

import { LoaderCircle } from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, query, orderBy, doc } from "firebase/firestore";
import type { Member, Payment, Plan } from "@/lib/types";
import { useMemo, useState, Suspense, useEffect } from "react";
import { Input } from "@/components/ui/input";
import PaymentStatusCard from "@/components/payments/payment-status-card";
import { useSearchParams } from "next/navigation";
import { isSameDay, parseISO, format, isSameMonth } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function PaymentsList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const searchParams = useSearchParams();
  const firestore = useFirestore();
  const { user, isUserLoading: isAuthLoading } = useUser();
  
  const dateFilter = searchParams.get('date');
  const statusParam = searchParams.get('status');
  const filterParam = searchParams.get('filter');

  useEffect(() => {
    if (filterParam === 'due_this_month') {
        setSelectedMonth(format(new Date(), 'yyyy-MM'));
        setStatusFilter('unpaid');
    } else if (dateFilter) {
      setSelectedMonth('');
    }
  }, [filterParam, dateFilter]);

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userDocRef);

  const paymentsQuery = useMemoFirebase(() => query(collection(firestore, "payments"), orderBy("paymentDate", "desc")), [firestore]);
  const { data: payments, isLoading: isLoadingPayments } = useCollection<Payment>(paymentsQuery);
  
  const membersRef = useMemoFirebase(() => collection(firestore, "members"), [firestore]);
  const { data: members, isLoading: isLoadingMembers } = useCollection<Member>(membersRef);

  const plansRef = useMemoFirebase(() => collection(firestore, "plans"), [firestore]);
  const { data: plans, isLoading: isLoadingPlans } = useCollection<Plan>(plansRef);

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
    if (!members || !planMap.size || !payments) return [];

    let tempMembers = [...members];
    
    // Status and Month Filtering
    if (selectedMonth) {
        const monthDate = new Date(selectedMonth + "-01T00:00:00");
        if (!isNaN(monthDate.getTime())) {
            tempMembers = tempMembers.filter(member => {
                const memberPlan = planMap.get(member.planId);
                if (!memberPlan) return false;

                const memberPayments = paymentsByMember.get(member.id) || [];
                const paymentsInSelectedMonth = memberPayments.filter(p => {
                    return p.status === 'paid' && isSameMonth(parseISO(p.paymentDate), monthDate);
                });

                const totalPaidForMonth = paymentsInSelectedMonth.reduce((acc, p) => acc + p.amount, 0);
                const monthlyInstallment = memberPlan.duration > 0 ? memberPlan.price / memberPlan.duration : memberPlan.price;
                const dueForMonth = Math.max(0, monthlyInstallment - totalPaidForMonth);
                
                if (statusFilter === 'unpaid') {
                    return dueForMonth > 0.01;
                } else if (statusFilter === 'paid') {
                    return dueForMonth <= 0.01;
                }
                
                return true;
            });
        }
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
  }, [members, searchQuery, payments, planMap, paymentsByMember, statusFilter, selectedMonth]);

  const isLoading = isLoadingPayments || isLoadingMembers || isLoadingPlans || isAuthLoading || (!!user && isProfileLoading);
  
  const pageTitle = useMemo(() => {
    if (dateFilter === 'today' && statusParam === 'paid') return "Today's Collections";
    if (statusFilter === 'unpaid') return "Unpaid / Due Members";
    if (statusFilter === 'paid') return "Paid Members";
    if (selectedMonth && !dateFilter) {
      try {
        return `Payments for ${format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}`;
      } catch (e) {
        return "Member Payments";
      }
    }
    return "Member Payments";
  }, [dateFilter, statusParam, selectedMonth, statusFilter]);
  
  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMonth = e.target.value;
    setSelectedMonth(newMonth);
    if(dateFilter || filterParam) {
      window.history.replaceState(null, '', '/payments');
    }
  };

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
            {pageTitle}
          </h1>
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
              <Input
                  placeholder="Search by name, ID, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-64"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                  </SelectContent>
              </Select>
              <Input
                  type="month"
                  value={selectedMonth}
                  onChange={handleMonthChange}
                  className="w-full sm:w-auto"
              />
          </div>
        </div>

        {filteredMembers && filteredMembers.length > 0 ? (
            <div className="space-y-6">
                {filteredMembers.map(member => {
                    const memberPlan = planMap.get(member.planId);
                    const memberPayments = paymentsByMember.get(member.id) || [];
                    if (!memberPlan) return null;

                    const hasPaymentInSelectedMonth = !!selectedMonth && memberPayments.some(p => {
                        try {
                            const monthDate = new Date(selectedMonth + '-01');
                            return isSameMonth(parseISO(p.paymentDate), monthDate);
                        } catch {
                            return false;
                        }
                    });

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
                            showHistoryInitially={showHistoryInitially || hasPaymentInSelectedMonth}
                            filterHistoryByDate={dateFilter}
                            filterHistoryByMonth={selectedMonth}
                        />
                    )
                })}
            </div>
        ) : (
             <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm py-12 mt-4">
                <div className="text-center">
                    <h3 className="text-2xl font-bold tracking-tight">
                        No members found
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        {searchQuery || statusFilter !== 'all' ? "Your filter returned no results." : "Add members in the 'Members' section to see them here."}
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
