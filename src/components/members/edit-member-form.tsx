
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertTriangle, LoaderCircle, Camera, Image as ImageIcon } from "lucide-react";
import { addMonths, format, parseISO } from "date-fns";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, updateDoc, serverTimestamp, query, where } from "firebase/firestore";
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
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmationOpen, setConfirmationOpen] = useState(false);
  const [formData, setFormData] = useState<z.infer<typeof formSchema> | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(member.imageUrl);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      form.setValue('profilePicture', e.target.files);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

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
    if (!user) return;
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
        userId: user.uid,
        joinDate: new Date(values.joinDate).toISOString(),
        imageUrl: imageUrl,
        updatedAt: serverTimestamp()
    };
    
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

          <div className="flex items-center gap-6 p-2">
            <div className="shrink-0">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button type="button" className="group relative h-20 w-20 rounded-full bg-muted flex items-center justify-center text-muted-foreground overflow-hidden border-2 border-primary/20 transition-all hover:border-primary">
                        {imagePreview ? (
                            <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                        ) : (
                            <Camera className="h-8 w-8" />
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="h-5 w-5 text-white" />
                        </div>
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56 rounded-xl p-2" sideOffset={5}>
                        <DropdownMenuItem 
                            className="gap-3 py-3 cursor-pointer rounded-lg focus:bg-primary/5"
                            onClick={() => document.getElementById('camera-upload-edit')?.click()}
                        >
                            <Camera className="h-4 w-4 text-primary" />
                            <span className="font-bold text-xs">Take Photo</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                            className="gap-3 py-3 cursor-pointer rounded-lg focus:bg-primary/5"
                            onClick={() => document.getElementById('gallery-upload-edit')?.click()}
                        >
                            <ImageIcon className="h-4 w-4 text-primary" />
                            <span className="font-bold text-xs">From Gallery</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <input
                    id="camera-upload-edit"
                    type="file"
                    accept="image/*"
                    capture="user"
                    className="hidden"
                    onChange={handleFileChange}
                />
                <input
                    id="gallery-upload-edit"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                />
            </div>
            
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
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="due">Due</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
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
