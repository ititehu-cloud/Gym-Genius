import { DollarSign, UserCheck, Users, CalendarX, Wallet, TrendingUp, TrendingDown } from "lucide-react";
import StatsCard from "@/components/dashboard/stats-card";
import AtRiskMembers from "@/components/dashboard/at-risk-members";
import { format } from "date-fns";
import { members, payments } from "@/lib/data";

export default function DashboardPage() {
  const today = new Date();
  const activeMembers = members.filter(m => m.status === 'active').length;
  const todaysPayments = payments.filter(p => p.date === format(today, 'yyyy-MM-dd'));
  const todaysCollection = todaysPayments.reduce((sum, p) => sum + p.amount, 0);
  const expiryToday = members.filter(m => m.expiryDate === format(today, 'yyyy-MM-dd')).length;
  const presentToday = 3; // Mock data

  const monthlyCollection = payments.filter(p => new Date(p.date).getMonth() === today.getMonth()).reduce((sum, p) => sum + p.amount, 0);
  const pendingDues = members.filter(m => m.status === 'due').length;

  const totalCollection = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalDues = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <h1 className="text-2xl font-headline font-semibold col-span-full">Today's Statistics ({format(today, "MMMM do, yyyy")})</h1>
        <StatsCard title="Active Members" value={activeMembers} icon={Users} color="text-primary" />
        <StatsCard title="Present Today" value={presentToday} icon={UserCheck} color="text-accent" />
        <StatsCard title="Expiry Today" value={expiryToday} icon={CalendarX} color="text-destructive" />
        <StatsCard title="Today's Collection" value={`₹${todaysCollection.toLocaleString()}`} icon={DollarSign} color="text-chart-2" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
         <h2 className="text-2xl font-headline font-semibold col-span-full">Monthly Statistics ({format(today, "MMMM")})</h2>
        <StatsCard title="Monthly Collection" value={`₹${monthlyCollection.toLocaleString()}`} icon={Wallet} color="text-chart-4" />
        <StatsCard title="Pending Dues" value={pendingDues} icon={TrendingDown} color="text-chart-1" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
         <h2 className="text-2xl font-headline font-semibold col-span-full">Overall Statistics</h2>
        <StatsCard title="Total Collection" value={`₹${totalCollection.toLocaleString()}`} icon={TrendingUp} color="text-chart-5" />
        <StatsCard title="Total Dues" value={`₹${totalDues.toLocaleString()}`} icon={TrendingDown} color="text-destructive" />
      </div>
      
      <AtRiskMembers />
    </main>
  );
}
