
'use client';

import { useState, useEffect } from 'react';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { LoaderCircle, Save, Building2, Phone, MapPin, Image as ImageIcon, Camera } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { uploadImage } from "@/app/actions";
import { compressImage } from "@/lib/utils";
import Image from 'next/image';

export default function SettingsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: profile, isLoading } = useDoc(userDocRef);

  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [displayAddress, setDisplayAddress] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setPhoneNumber(profile.phoneNumber || '');
      setDisplayAddress(profile.displayAddress || '');
      setIconUrl(profile.icon || '');
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userDocRef) return;

    setIsSaving(true);
    try {
      await setDoc(userDocRef, {
        id: user.uid,
        email: user.email,
        displayName,
        phoneNumber,
        displayAddress,
        icon: iconUrl,
        updatedAt: serverTimestamp()
      }, { merge: true });

      toast({
        title: "Settings Saved",
        description: "Your gym branding has been updated successfully.",
      });
    } catch (error) {
      console.error("Save settings error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update settings.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const compressedBlob = await compressImage(file, { maxWidth: 400, quality: 0.8 });
      const formData = new FormData();
      formData.append('image', compressedBlob, file.name);
      
      const result = await uploadImage(formData);
      if (result.url) {
        setIconUrl(result.url);
        toast({ title: "Logo Uploaded", description: "Remember to save your settings." });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Upload Failed", description: error.message });
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <LoaderCircle className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-headline font-semibold">Gym Settings</h1>
      </div>

      <div className="max-w-2xl mx-auto w-full">
        <Card>
          <CardHeader>
            <CardTitle>Branding & Profile</CardTitle>
            <CardDescription>
              This information appears on Member ID cards, Payment Receipts, and WhatsApp messages.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="relative group">
                  <div className="h-24 w-24 rounded-xl border-2 border-dashed border-primary/20 flex items-center justify-center bg-muted overflow-hidden">
                    {iconUrl ? (
                      <Image src={iconUrl} alt="Logo" fill className="object-contain p-2" />
                    ) : (
                      <Building2 className="h-10 w-10 text-muted-foreground" />
                    )}
                    {isUploading && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <LoaderCircle className="h-6 w-6 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                  <label htmlFor="logo-upload" className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center cursor-pointer shadow-lg hover:bg-primary/90 transition-colors">
                    <Camera className="h-4 w-4" />
                    <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={isUploading} />
                  </label>
                </div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Gym Logo / Icon</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="gym-name" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" /> Gym Name
                  </Label>
                  <Input 
                    id="gym-name" 
                    placeholder="e.g. Sardar Fitness" 
                    value={displayName} 
                    onChange={(e) => setDisplayName(e.target.value)} 
                    required 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" /> Contact Number
                  </Label>
                  <Input 
                    id="phone" 
                    placeholder="9876543210" 
                    value={phoneNumber} 
                    onChange={(e) => setPhoneNumber(e.target.value)} 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Display Address
                  </Label>
                  <Input 
                    id="address" 
                    placeholder="Main Street, City..." 
                    value={displayAddress} 
                    onChange={(e) => setDisplayAddress(e.target.value)} 
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button type="submit" className="w-full h-11 text-lg font-bold" disabled={isSaving || isUploading}>
                  {isSaving ? <LoaderCircle className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                  Update Profile
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
