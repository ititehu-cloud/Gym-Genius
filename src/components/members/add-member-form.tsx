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
import { AlertTriangle, LoaderCircle, Camera, CreditCard, User, Upload } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import CameraCaptureDialog from "./camera-capture-dialog";

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
  const [isCameraOpen, setCameraOpen] = useState(false);
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

  const handleCameraCapture = (file: File) => {
    form.setValue('profilePicture', [file]);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
        <ScrollArea className="flex-1">
          <div className="max-w-3xl mx-auto p-6 space-y-8">
            {formError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <section className="space-y-6">
              <div className="flex items-center gap-2 text-primary font-bold">
                <User className="h-5 w-5" />
                <h3 className="uppercase tracking-widest text-sm">Member Profile</h3>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-8 bg-muted/20 p-6 rounded-2xl border border-muted-foreground/10">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative h-40 w-40 rounded-full bg-muted flex items-center justify-center text-muted-foreground overflow-hidden border-4 border-white shadow-2xl">
                      {imagePreview ? (
                          <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                      ) : (
                          <User className="h-16 w-16 opacity-20" />
                      )}
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            type="button" 
                            variant="secondary" 
                            size="sm" 
                            className="rounded-full gap-2"
                            onClick={() => setCameraOpen(true)}
                        >
                            <Camera className="h-4 w-4" />
                            Camera
                        </Button>
                        <FormField
                            control={form.control}
                            name="profilePicture"
                            render={() => (
                                <FormItem>
                                    <FormControl>
                                        <>
                                            <label htmlFor="picture-upload-add">
                                                <Button type="button" variant="outline" size="sm" className="rounded-full gap-2 pointer-events-none">
                                                    <Upload className="h-4 w-4" />
                                                    Upload
                                                </Button>
                                            </label>
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
                                        </>
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    </div>
                </div>
                
                <div className="flex-1 w-full space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter member's name" className="h-12 text-lg" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="memberId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Member ID</FormLabel>
                          <FormControl>
                            <Input placeholder="GYM-001" className="h-11 font-mono" {...field} />
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
                          <FormLabel>Mobile Number</FormLabel>
                          <FormControl>
                            <Input placeholder="9876543210" className="h-11" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="joinDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Joining Date</FormLabel>
                      <FormControl>
                        <Input type="date" className="h-11" {...field} />
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
                      <FormLabel>Membership Plan</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select a plan" />
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
                    <FormLabel>Home Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter residential address" className="h-11" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </section>

            <section className="bg-primary/5 p-8 rounded-3xl space-y-6 border border-primary/10 shadow-inner">
              <div className="flex items-center gap-2 text-primary font-bold">
                <CreditCard className="h-5 w-5" />
                <h3 className="uppercase tracking-widest text-sm">Initial Payment</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="paymentAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount Received (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" className="h-12 text-xl font-bold text-primary" {...field} />
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
                          <SelectTrigger className="h-12">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
                <FormField
                  control={form.control}
                  name="paymentDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Date</FormLabel>
                      <FormControl>
                        <Input type="date" className="h-11 bg-white" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="bg-white p-4 rounded-xl border-2 border-dashed flex justify-between items-center h-[52px]">
                  <span className="text-xs font-black uppercase text-muted-foreground">Remaining Due</span>
                  <div className={`text-xl font-black ${dueAmount > 0 ? 'text-destructive' : 'text-green-600'}`}>
                    ₹{dueAmount.toFixed(0)}
                  </div>
                </div>
              </div>
              
              <p className="text-[10px] text-muted-foreground text-center font-medium italic">
                * Membership cycle will automatically renew if full plan amount is paid.
              </p>
            </section>
          </div>
        </ScrollArea>
        
        <div className="p-6 border-t bg-muted/30 shrink-0 flex items-center justify-center gap-4">
            <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setDialogOpen(false)}
                className="h-14 px-8 text-lg font-semibold"
            >
                Cancel
            </Button>
            <Button 
                type="submit" 
                disabled={isSubmitting}
                className="h-14 px-12 text-lg font-bold min-w-[240px] shadow-lg shadow-primary/20"
            >
                {isSubmitting ? (
                  <>
                    <LoaderCircle className="mr-3 h-6 w-6 animate-spin" />
                    Registering...
                  </>
                ) : (
                  "Create Member Profile"
                )}
            </Button>
        </div>

        <CameraCaptureDialog 
            isOpen={isCameraOpen} 
            onOpenChange={setCameraOpen} 
            onCapture={handleCameraCapture} 
        />
      </form>
    </Form>
  );
}
