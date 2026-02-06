import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, PlusCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { payments, members, plans } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";

export default function PaymentsPage() {
  const getMemberName = (id: string) => members.find(m => m.id === id)?.name || 'N/A';
  
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-headline font-semibold">Payments</h1>
        <Button>
          <PlusCircle />
          Record Payment
        </Button>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {payments.slice(0, 5).map(payment => (
                        <TableRow key={payment.id}>
                            <TableCell>{getMemberName(payment.memberId)}</TableCell>
                            <TableCell>₹{payment.amount.toFixed(2)}</TableCell>
                            <TableCell>{format(parseISO(payment.date), 'MMM dd, yyyy')}</TableCell>
                            <TableCell>
                                <Badge variant={payment.status === 'paid' ? 'default' : 'destructive'} className="capitalize">{payment.status}</Badge>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </main>
  );
}
