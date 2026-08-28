'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, LoaderCircle, Camera, CreditCard } from "lucide-react";
import { addMonths, format } from "date-fns";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection, addDoc, serverTimestamp, query, where } from "firebase/firestore";
import type { Plan, Member } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";
import Image from "next/image";
import { uploadImage } from "@/app/actions";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { compressImage } from "@/lib/utils";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

const formSchema = z.object({
  memberId: z.string().min(1, { message: "Member ID cannot be empty." }),
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  mobileNumber: z.string().optional(),
  address: z.string().min(5, { message: "Address is too short." }),
  planId: z.string({ required_error: "Please select a membership plan." }),
  joinDate: z.string({ required_error: "Please select a joining date." }),
  profilePicture: z.any().optional(),
  paymentAmount: z.coerce.number().min(0).optional(),
  paymentDate: z.string().optional(),
  paymentMethod: z.string().optional(),
});

type AddMemberFormProps = {
  setDialogOpen: (open: boolean) => void;
};

export default function AddMemberForm({ setDialogOpen }: AddMemberFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  
  const plansRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "plans"), where("userId", "==", user.uid));
  }, [firestore, user]);
  const { data: plans } = useCollection<Plan>(plansRef);

  const membersRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "members"), where("userId", "==", user.uid));
  }, [firestore, user]);
  const { data: members } = useCollection<Member>(membersRef);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      memberId: "",
      name: "",
      mobileNumber: "",
      address: "",
      joinDate: format(new Date(), 'yyyy-MM-dd'),
      paymentAmount: 0,
      paymentDate: format(new Date(), 'yyyy-MM-dd'),
      paymentMethod: "cash",
    },
  });

  // Watch for plan and payment changes to calculate due amount
  const watchedPlanId = form.watch('planId');
  const watchedPaymentAmount = form.watch('paymentAmount') || 0;

  const { selectedPlan, dueAmount } = useMemo(() => {
    const plan = plans?.find(p => p.id === watchedPlanId);
    const due = plan ? Math.max(0, plan.price - watchedPaymentAmount) : 0;
    return { selectedPlan: plan, dueAmount: due };
  }, [plans, watchedPlanId, watchedPaymentAmount]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return;
    setIsSubmitting(true);
    setFormError(null);
    
    const isIdDuplicate = members?.some(m => m.memberId.toLowerCase() === values.memberId.toLowerCase());
    if (isIdDuplicate) {
      setFormError(`A member with ID "${values.memberId}" already exists.`);
      setIsSubmitting(false);
      return;
    }

    let imageUrl: string | undefined = undefined;
    const imageFile = values.profilePicture?.[0];

    if (imageFile) {
        try {
            const compressedBlob = await compressImage(imageFile, { maxWidth: 800, quality: 0.8 });
            const formData = new FormData();
            formData.append('image', compressedBlob, imageFile.name.replace(/\.[^/.]+$/, ".jpg"));
            const uploadResult = await uploadImage(formData);
            if (uploadResult.url) imageUrl = uploadResult.url;
        } catch (err) {
            console.error("Image upload error:", err);
        }
    }

    if (!imageUrl) {
      imageUrl = `https://picsum.photos/seed/${values.memberId}/400/400`;
    }

    if (!selectedPlan) {
        setFormError('Plan not found.');
        setIsSubmitting(false);
        return;
    }
    
    const expiryDate = addMonths(new Date(values.joinDate), selectedPlan.duration);
    
    const membersCollection = collection(firestore, "members");
    const data = {
        userId: user.uid,
        memberId: values.memberId,
        name: values.name,
        address: values.address,
        planId: values.planId,
        mobileNumber: values.mobileNumber || "",
        joinDate: new Date(values.joinDate + 'T00:00:00').toISOString(),
        expiryDate: expiryDate.toISOString(),
        status: 'active',
        imageUrl: imageUrl,
        createdAt: serverTimestamp()
    };

    addDoc(membersCollection, data)
        .then(async (docRef) => {
            // Record initial payment if amount is specified
            if (values.paymentAmount && values.paymentAmount > 0) {
              const paymentsCollection = collection(firestore, "payments");
              const paymentDate = values.paymentDate || values.joinDate;
              await addDoc(paymentsCollection, {
                userId: user.uid,
                memberId: docRef.id,
                amount: values.paymentAmount,
                paymentDate: new Date(paymentDate + 'T00:00:00').toISOString(),
                paymentMethod: values.paymentMethod || 'cash',
                paymentType: 'renewal',
                status: 'paid',
                createdAt: serverTimestamp()
              });
            }

            toast({ title: "Success!", description: `${values.name} added successfully.` });
            form.reset();
            setDialogOpen(false);
        })
        .catch(async (error) => {
            console.error("Add member error:", error);
            const permissionError = new FirestorePermissionError({
                path: membersCollection.path,
                operation: 'create',
                requestResourceData: data,
            });
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => {
            setIsSubmitting(false);
        });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
        {formError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center gap-4">
            <div className="flex-grow">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                        <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>
             <div className="flex flex-col items-center gap-1">
                <FormField
                    control={form.control}
                    name="profilePicture"
                    render={() => (
                        <FormItem>
                            <FormControl>
                                <label htmlFor="picture-upload-add" className="cursor-pointer">
                                    <div className="relative h-16 w-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground overflow-hidden hover:bg-muted/80">
                                    {imagePreview ? (
                                        <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                                    ) : (
                                        <Camera className="h-8 w-8" />
                                    )}
                                    </div>
                                    <Input
                                    id="picture-upload-add"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                        form.setValue('profilePicture', e.target.files);
                                        const reader = new FileReader();
                                        reader.onloadend = () => setImagePreview(reader.result as string);
                                        reader.readAsDataURL(file);
                                        }
                                    }}
                                    />
                                </label>
                            </FormControl>
                        </FormItem>
                    )}
                />
            </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="memberId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Member ID</FormLabel>
                <FormControl>
                  <Input placeholder="GYM-001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="mobileNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mobile</FormLabel>
                <FormControl>
                  <Input placeholder="9876543210" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="joinDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Join Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="planId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Plan</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select plan" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {plans?.map(p => <SelectItem key={p.id} value={p.id}>{p.name} (₹{p.price})</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input placeholder="Main St..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="bg-muted/30 p-4 rounded-lg space-y-4 border border-dashed border-muted-foreground/20">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Initial Payment Details</h4>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="paymentAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount Paid (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Mode</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="net_banking">Net Banking</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="paymentDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Due Amount</span>
              <div className={`h-10 px-3 flex items-center rounded-md border bg-muted/50 font-bold ${dueAmount > 0 ? 'text-destructive' : 'text-green-600'}`}>
                ₹{dueAmount.toFixed(2)}
              </div>
            </div>
          </div>
          
          <p className="text-[10px] text-muted-foreground">The due amount is automatically calculated as (Plan Price - Amount Paid).</p>
        </div>
        
        <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-white pb-2">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                Add Member
            </Button>
        </div>
      </form>
    </Form>
  );
}
