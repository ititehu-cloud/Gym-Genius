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
  mobileNumber: z.string().min(10, { message: "Please enter a valid mobile number." }),
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      memberId: member.memberId || '',
      name: member.name,
      mobileNumber: member.mobileNumber,
      address: member.address,
      planId: member.planId,
      joinDate: format(parseISO(member.joinDate), 'yyyy-MM-dd'),
      status: member.status,
    },
  });

  const planChanged = form.watch('planId') !== member.planId;
  const joinDateChanged = form.watch('joinDate') !== format(parseISO(member.joinDate), 'yyyy-MM-dd');

  function onFormSubmit(values: z.infer<typeof formSchema>) {
    setFormError(null);
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

            if (uploadResult.error) {
                setFormError(uploadResult.error);
                setIsSubmitting(false);
                return;
            }
            if (uploadResult.url) {
                imageUrl = uploadResult.url;
            }
        } catch (compressionError: any) {
            console.error("Image compression error:", compressionError);
            setFormError(compressionError.message || "Failed to process image. Please try a different one.");
            setIsSubmitting(false);
            return;
        }
    } else if (imagePreview === null) {
        // This means the image was removed by the user
        imageUrl = `https://picsum.photos/seed/${Math.random()}/400/400`;
    }

    if (!plans) {
      setFormError('Plans not loaded.');
      setIsSubmitting(false);
      return;
    }

    const memberDocRef = doc(firestore, "members", member.id);
    
    const { profilePicture, ...dataToSave } = values;

    const updateData: Partial<Member & {updatedAt: any}> = {
        ...dataToSave,
        joinDate: new Date(values.joinDate).toISOString(),
        imageUrl: imageUrl,
        updatedAt: serverTimestamp()
    };
    
    if(updateExpiry) {
        const selectedPlan = plans.find(p => p.id === values.planId);
        if (!selectedPlan) {
            setFormError('Selected plan not found.');
            setIsSubmitting(false);
            return;
        }
        const newExpiryDate = addMonths(new Date(values.joinDate), selectedPlan.duration);
        updateData.expiryDate = newExpiryDate.toISOString();
    }


    try {
      await updateDoc(memberDocRef, updateData);

      toast({
        title: "Member Updated!",
        description: `${values.name}'s details have been successfully updated.`,
      });
      form.reset({ ...values, profilePicture: null });
      setDialogOpen(false);
    } catch (error) {
      console.error("Error updating member:", error);
      const errorMessage = error instanceof Error ? error.message : "There was a problem updating the member. Please try again.";
      setFormError(errorMessage);
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
                                        <Image src={imagePreview} alt="Profile preview" fill className="object-cover" />
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
                                        reader.onloadend = () => {
                                            setImagePreview(reader.result as string);
                                        };
                                        reader.readAsDataURL(file);
                                        }
                                    }}
                                    />
                                </label>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 {imagePreview && (
                    <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => {
                        form.setValue('profilePicture', null);
                        setImagePreview(null);
                    }}>Remove</Button>
                )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="memberId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Member ID</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., GYM-001" {...field} />
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
                    <Input placeholder="9876543210" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="joinDate"
              render={({ field }) => (
                  <FormItem>
                      <FormLabel>Joining Date</FormLabel>
                      <FormControl>
                          <Input
                              type="date"
                              {...field}
                          />
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
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingPlans}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingPlans ? "Loading..." : "Select a plan"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {plans?.map(plan => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="123, Main Street, Anytown..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select member status" />
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
                )}
              />
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
            <AlertDialogHeader>
                <AlertDialogTitle>Update Expiry Date?</AlertDialogTitle>
                <AlertDialogDescription>
                    You have changed the membership plan or the joining date. Do you want to automatically recalculate and update the membership expiry date based on the new selection?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <Button variant="outline" onClick={() => formData && handleUpdate(formData, false)} disabled={isSubmitting}>
                    No, Keep Old Expiry
                </Button>
                <AlertDialogAction onClick={() => formData && handleUpdate(formData, true)} disabled={isSubmitting}>
                    {isSubmitting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Yes, Update Expiry
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
