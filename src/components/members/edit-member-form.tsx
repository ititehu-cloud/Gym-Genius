
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
import { AlertTriangle, LoaderCircle, Camera } from "lucide-react";
import { addMonths, format, parseISO } from "date-fns";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import type { Member, Plan } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "../ui/alert-dialog";
import Image from "next/image";
import { uploadImage } from "@/app/actions";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { compressImage } from "@/lib/utils";

const formSchema = z.object({
  memberId: z.string().min(1, { message: "Member ID cannot be empty." }),
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  mobileNumber: z.string().optional(),
  address: z.string().min(5, { message: "Address is too short." }),
  planId: z.string({ required_error: "Please select a membership plan." }),
  joinDate: z.string({ required_error: "Please select a joining date." }),
  status: z.enum(['active', 'expired', 'due']),
  profilePicture: z.any().optional(),
});

type EditMemberFormProps = {
  member: Member;
  setDialogOpen: (open: boolean) => void;
};

export default function EditMemberForm({ member, setDialogOpen }: EditMemberFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmationOpen, setConfirmationOpen] = useState(false);
  const [formData, setFormData] = useState<z.infer<typeof formSchema> | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(member.imageUrl);
  const [formError, setFormError] = useState<string | null>(null);

  const plansRef = useMemoFirebase(() => collection(firestore, "plans"), [firestore]);
  const { data: plans, isLoading: isLoadingPlans } = useCollection<Plan>(plansRef);

  const membersRef = useMemoFirebase(() => collection(firestore, "members"), [firestore]);
  const { data: members } = useCollection<Member>(membersRef);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      memberId: member.memberId || '',
      name: member.name,
      mobileNumber: member.mobileNumber || "",
      address: member.address,
      planId: member.planId,
      joinDate: format(parseISO(member.joinDate), 'yyyy-MM-dd'),
      status: member.status,
    },
  });

  const nameChanged = form.watch('name') !== member.name;
  const mobileChanged = form.watch('mobileNumber') !== member.mobileNumber;
  const planChanged = form.watch('planId') !== member.planId;
  const joinDateChanged = form.watch('joinDate') !== format(parseISO(member.joinDate), 'yyyy-MM-dd');

  function onFormSubmit(values: z.infer<typeof formSchema>) {
    setFormError(null);
    
    const isIdDuplicate = members?.some(m => m.id !== member.id && m.memberId.toLowerCase() === values.memberId.toLowerCase());
    if (isIdDuplicate) {
      setFormError(`A member with ID "${values.memberId}" already exists.`);
      return;
    }

    setFormData(values);
    if (planChanged || joinDateChanged) {
        setConfirmationOpen(true);
    } else {
        handleUpdate(values);
    }
  }

  async function handleUpdate(values: z.infer<typeof formSchema>, updateExpiry: boolean = false) {
    setIsSubmitting(true);
    setConfirmationOpen(false);
    setFormError(null);

    let imageUrl = member.imageUrl;
    const imageFile = values.profilePicture?.[0];

    if (imageFile) {
        try {
            const compressedBlob = await compressImage(imageFile, { maxWidth: 800, quality: 0.8 });
            const formData = new FormData();
            formData.append('image', compressedBlob, imageFile.name.replace(/\.[^/.]+$/, ".jpg"));
            const uploadResult = await uploadImage(formData);
            if (uploadResult.url) imageUrl = uploadResult.url;
        } catch (err) {
            setFormError("Failed to process image.");
            setIsSubmitting(false);
            return;
        }
    }

    const { profilePicture, ...dataToSave } = values;
    const updateData: any = {
        ...dataToSave,
        joinDate: new Date(values.joinDate).toISOString(),
        imageUrl: imageUrl,
        updatedAt: serverTimestamp()
    };
    
    // IF critical ID card data changed, clear the pre-generated URL so it regenerates on next share
    if (nameChanged || mobileChanged || planChanged || updateExpiry || imageFile) {
      updateData.idCardUrl = null; 
    }

    if(updateExpiry && plans) {
        const selectedPlan = plans.find(p => p.id === values.planId);
        if (selectedPlan) {
            updateData.expiryDate = addMonths(new Date(values.joinDate), selectedPlan.duration).toISOString();
            updateData.status = 'active';
        }
    }

    try {
      await updateDoc(doc(firestore, "members", member.id), updateData);
      toast({ title: "Member Updated!", description: "Details updated successfully." });
      setDialogOpen(false);
    } catch (error) {
      setFormError("Update failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-4">
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
                                <label htmlFor="picture-upload-edit" className="cursor-pointer">
                                    <div className="relative h-16 w-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground overflow-hidden hover:bg-muted/80">
                                    {imagePreview ? (
                                        <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                                    ) : (
                                        <Camera className="h-8 w-8" />
                                    )}
                                    </div>
                                    <Input
                                    id="picture-upload-edit"
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
            <FormField control={form.control} name="memberId" render={({ field }) => (
                <FormItem><FormLabel>Member ID</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="mobileNumber" render={({ field }) => (
                <FormItem><FormLabel>Mobile</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="joinDate" render={({ field }) => (
                <FormItem><FormLabel>Join Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="planId" render={({ field }) => (
                <FormItem><FormLabel>Plan</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{plans?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
            )} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="expired">Expired</SelectItem><SelectItem value="due">Due</SelectItem></SelectContent></Select><FormMessage /></FormItem>
            )} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
              </Button>
          </div>
        </form>
      </Form>
      <AlertDialog open={isConfirmationOpen} onOpenChange={setConfirmationOpen}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Update Expiry Date?</AlertDialogTitle><AlertDialogDescription>Would you like to recalculate the expiry date based on the new selection?</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter>
                <Button variant="outline" onClick={() => formData && handleUpdate(formData, false)} disabled={isSubmitting}>No</Button>
                <AlertDialogAction onClick={() => formData && handleUpdate(formData, true)} disabled={isSubmitting}>Yes</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
