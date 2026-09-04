
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Member, Plan, Payment, MemberNote } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { Badge } from "../ui/badge";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, where, orderBy, addDoc, serverTimestamp, deleteDoc, doc } from "firebase/firestore";
import { ScrollArea } from "../ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { CreditCard, User, LoaderCircle, NotebookPen, Calendar, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Input } from "../ui/input";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

type MemberDetailsDialogProps = {
  member: Member;
  plan?: Plan;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function MemberDetailsDialog({ member, plan, isOpen, onOpenChange }: MemberDetailsDialogProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [noteContent, setNoteContent] = useState("");
  const [noteDate, setNoteDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isAddingNote, setIsAddingNote] = useState(false);

  const paymentsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !member.id || !isOpen) return null;
    return query(
      collection(firestore, "payments"),
      where("userId", "==", user.uid),
      where("memberId", "==", member.id),
      orderBy("paymentDate", "desc")
    );
  }, [firestore, user, member.id, isOpen]);
  
  const { data: payments, isLoading: isLoadingPayments } = useCollection<Payment>(paymentsQuery);

  const notesQuery = useMemoFirebase(() => {
    if (!firestore || !user || !member.id || !isOpen) return null;
    return query(
      collection(firestore, "notes"),
      where("userId", "==", user.uid),
      where("memberId", "==", member.id),
      orderBy("noteDate", "desc")
    );
  }, [firestore, user, member.id, isOpen]);

  const { data: notes, isLoading: isLoadingNotes } = useCollection<MemberNote>(notesQuery);

  const totalPaid = useMemo(() => {
    if (!payments) return 0;
    return payments.reduce((sum, p) => p.status === 'paid' ? sum + p.amount : sum, 0);
  }, [payments]);

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !noteContent.trim()) return;

    setIsAddingNote(true);
    const notesCollection = collection(firestore, "notes");
    const noteData = {
      userId: user.uid,
      memberId: member.id,
      content: noteContent.trim(),
      noteDate: new Date(noteDate + 'T00:00:00').toISOString(),
      createdAt: serverTimestamp(),
    };

    addDoc(notesCollection, noteData)
      .then(() => {
        setNoteContent("");
        toast({ title: "Note Added", description: "Your note has been saved." });
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: notesCollection.path,
          operation: 'create',
          requestResourceData: noteData,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsAddingNote(false);
      });
  };

  const handleDeleteNote = (noteId: string) => {
    const noteRef = doc(firestore, "notes", noteId);
    deleteDoc(noteRef)
      .then(() => {
        toast({ title: "Note Deleted", description: "The note has been removed." });
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: noteRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] h-[85vh] flex flex-col p-0 overflow-hidden rounded-2xl border-2 border-primary/20 [&>button]:text-primary-foreground [&>button]:opacity-100 [&>button]:bg-white/10 [&>button]:hover:bg-white/20 [&>button]:z-50 [&>button]:rounded-full [&>button]:p-1">
        <DialogHeader className="p-6 pb-4 bg-primary text-primary-foreground shrink-0">
          <div className="flex items-center gap-6">
             <Avatar className="h-20 w-20 border-4 border-white/20 shadow-xl">
                <AvatarImage src={member.imageUrl} alt={member.name} className="object-cover" />
                <AvatarFallback className="bg-white text-primary text-3xl font-bold">{member.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
                <DialogTitle className="text-3xl font-black uppercase tracking-tight">{member.name}</DialogTitle>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium opacity-90">
                    <span>ID: <span className="font-mono">{member.memberId}</span></span>
                    <span>•</span>
                    <span>{plan?.name || 'No Plan'}</span>
                    <span>•</span>
                    <Badge variant="outline" className="bg-white/10 text-white border-white/30 text-[10px] font-bold uppercase tracking-widest">
                        {member.status}
                    </Badge>
                </div>
            </div>
          </div>
          <DialogDescription className="sr-only">
            Detailed information for member {member.name}, including profile, payment history and notes.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden p-0">
            <Tabs defaultValue="profile" className="h-full flex flex-col">
                <div className="px-6 pt-4 bg-muted/30 border-b shrink-0">
                    <TabsList className="grid w-full grid-cols-3 h-12 bg-muted p-1">
                        <TabsTrigger value="profile" className="gap-2 font-bold uppercase text-[10px] tracking-widest">
                            <User className="h-4 w-4"/> Profile
                        </TabsTrigger>
                        <TabsTrigger value="payments" className="gap-2 font-bold uppercase text-[10px] tracking-widest">
                            <CreditCard className="h-4 w-4"/> Payments
                        </TabsTrigger>
                        <TabsTrigger value="notes" className="gap-2 font-bold uppercase text-[10px] tracking-widest">
                            <NotebookPen className="h-4 w-4"/> Notes
                        </TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-1 overflow-hidden p-6">
                    <TabsContent value="profile" className="mt-0 h-full data-[state=active]:flex flex-col">
                        <ScrollArea className="h-full pr-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <section className="space-y-4">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary border-l-4 border-primary pl-3">
                                        Personal Profile
                                    </h3>
                                    <div className="grid gap-3">
                                        <div className="p-3 bg-muted/40 rounded-lg space-y-1">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Full Name</p>
                                            <p className="font-bold text-lg">{member.name}</p>
                                        </div>
                                        <div className="p-3 bg-muted/40 rounded-lg space-y-1">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Member ID</p>
                                            <p className="font-black font-mono text-lg">{member.memberId}</p>
                                        </div>
                                        <div className="p-3 bg-muted/40 rounded-lg space-y-1">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Mobile Number</p>
                                            <p className="font-bold text-lg">{member.mobileNumber || 'N/A'}</p>
                                        </div>
                                        <div className="p-3 bg-muted/40 rounded-lg space-y-1">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Home Address</p>
                                            <p className="font-medium text-sm leading-relaxed">{member.address}</p>
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-chart-2 border-l-4 border-chart-2 pl-3">
                                        Membership Status
                                    </h3>
                                    <div className="grid gap-3">
                                         <div className="p-3 bg-muted/40 rounded-lg space-y-1 border-l-4 border-primary">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Current Plan</p>
                                            <p className="font-black text-xl text-primary">{plan?.name || 'N/A'}</p>
                                            <p className="text-xs font-bold text-muted-foreground">₹{plan?.price} for {plan?.duration} Months</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="p-3 bg-chart-2/10 rounded-lg space-y-1">
                                                <p className="text-[10px] font-bold text-chart-2 uppercase">Join Date</p>
                                                <p className="font-black text-chart-2">{format(parseISO(member.joinDate), 'dd MMM yyyy')}</p>
                                            </div>
                                            <div className="p-3 bg-destructive/10 rounded-lg space-y-1">
                                                <p className="text-[10px] font-bold text-destructive uppercase">Expiry Date</p>
                                                <p className="font-black text-destructive">{format(parseISO(member.expiryDate), 'dd MMM yyyy')}</p>
                                            </div>
                                        </div>
                                        <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 flex justify-between items-center">
                                            <div>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Total Collections</p>
                                                <p className="text-2xl font-black text-primary">₹{totalPaid}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Plan Value</p>
                                                <p className="text-lg font-bold">₹{plan?.price || 0}</p>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="payments" className="mt-0 h-full data-[state=active]:flex flex-col">
                         {isLoadingPayments ? (
                             <div className="flex flex-col items-center justify-center flex-1 gap-4">
                                <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Loading Transactions...</p>
                             </div>
                         ) : (
                            <div className="h-full flex flex-col">
                                <div className="mb-4 flex justify-between items-end shrink-0">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Payment Passbook</h3>
                                    <Badge variant="outline" className="font-mono">Total Records: {payments?.length || 0}</Badge>
                                </div>
                                <div className="flex-1 overflow-hidden border rounded-xl bg-card shadow-inner">
                                    <ScrollArea className="h-full">
                                        <Table>
                                            <TableHeader className="bg-muted/50 sticky top-0 z-10">
                                                <TableRow>
                                                    <TableHead className="text-[10px] font-black uppercase">Date</TableHead>
                                                    <TableHead className="text-[10px] font-black uppercase">Type</TableHead>
                                                    <TableHead className="text-[10px] font-black uppercase">Method</TableHead>
                                                    <TableHead className="text-right text-[10px] font-black uppercase">Amount</TableHead>
                                                    <TableHead className="text-center text-[10px] font-black uppercase">Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {payments && payments.length > 0 ? (
                                                    payments.map((p) => (
                                                        <TableRow key={p.id} className="hover:bg-muted/30 transition-colors">
                                                            <TableCell className="font-bold">{format(parseISO(p.paymentDate), 'dd MMM yyyy')}</TableCell>
                                                            <TableCell className="capitalize font-medium text-xs">{p.paymentType}</TableCell>
                                                            <TableCell className="capitalize font-medium text-xs">{p.paymentMethod}</TableCell>
                                                            <TableCell className="text-right font-black font-mono text-primary text-base">₹{p.amount}</TableCell>
                                                            <TableCell className="text-center">
                                                                <Badge variant={p.status === 'paid' ? 'default' : 'destructive'} className={`${p.status === 'paid' ? 'bg-green-600 text-white' : ''} text-[9px] h-5`}>
                                                                    {p.status.toUpperCase()}
                                                                </Badge>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="text-center py-20">
                                                            <div className="flex flex-col items-center gap-2 opacity-40">
                                                                <CreditCard className="h-10 w-10" />
                                                                <p className="text-sm font-bold uppercase tracking-widest">No transactions recorded</p>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </ScrollArea>
                                </div>
                            </div>
                         )}
                    </TabsContent>

                    <TabsContent value="notes" className="mt-0 h-full data-[state=active]:flex flex-col gap-6">
                        <section className="bg-muted/30 p-4 rounded-xl border border-dashed border-primary/20 shrink-0">
                            <form onSubmit={handleAddNote} className="space-y-4">
                                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                                    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border shadow-sm w-full sm:w-auto">
                                        <Calendar className="h-4 w-4 text-primary" />
                                        <Input 
                                            type="date" 
                                            value={noteDate} 
                                            onChange={(e) => setNoteDate(e.target.value)}
                                            className="border-none h-6 p-0 focus-visible:ring-0 text-sm font-bold w-[120px]"
                                        />
                                    </div>
                                    <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Add New Note</h4>
                                </div>
                                <div className="flex gap-2">
                                    <Textarea 
                                        placeholder="Type your note about the member here..."
                                        value={noteContent}
                                        onChange={(e) => setNoteContent(e.target.value)}
                                        className="bg-white resize-none h-20 text-sm border-primary/10"
                                    />
                                    <Button 
                                        type="submit" 
                                        disabled={isAddingNote || !noteContent.trim()}
                                        className="h-20 w-20 flex-col gap-1 font-bold text-[10px] uppercase tracking-tighter"
                                    >
                                        {isAddingNote ? <LoaderCircle className="animate-spin h-5 w-5" /> : <Plus className="h-5 w-5" />}
                                        Save Note
                                    </Button>
                                </div>
                            </form>
                        </section>

                        <section className="flex-1 overflow-hidden flex flex-col">
                            <div className="mb-3 flex items-center justify-between">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Member Timeline</h3>
                                <Badge variant="secondary" className="font-mono text-[9px]">{notes?.length || 0} Notes</Badge>
                            </div>
                            
                            <div className="flex-1 overflow-hidden border rounded-xl bg-card shadow-inner">
                                <ScrollArea className="h-full">
                                    {isLoadingNotes ? (
                                        <div className="p-12 flex justify-center">
                                            <LoaderCircle className="h-6 w-6 animate-spin text-primary opacity-20" />
                                        </div>
                                    ) : notes && notes.length > 0 ? (
                                        <div className="p-4 space-y-4">
                                            {notes.map((note) => (
                                                <div key={note.id} className="relative group bg-muted/40 hover:bg-muted/60 transition-colors p-4 rounded-lg border border-transparent hover:border-primary/10">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="h-3 w-3 text-primary" />
                                                            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                                                                {format(parseISO(note.noteDate), 'dd MMM yyyy')}
                                                            </span>
                                                        </div>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                            onClick={() => handleDeleteNote(note.id)}
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                    <p className="text-sm font-medium leading-relaxed text-foreground whitespace-pre-wrap">
                                                        {note.content}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-20 opacity-30 gap-3">
                                            <NotebookPen className="h-12 w-12" />
                                            <p className="text-sm font-black uppercase tracking-widest">No notes yet</p>
                                        </div>
                                    )}
                                </ScrollArea>
                            </div>
                        </section>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
