'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw, X, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type CameraCaptureDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (file: File) => void;
};

export default function CameraCaptureDialog({ isOpen, onOpenChange, onCapture }: CameraCaptureDialogProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const startCamera = async () => {
    setIsInitializing(true);
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 1024 },
          height: { ideal: 1024 }
        }, 
        audio: false 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setError("Could not access camera. Please ensure you have granted permission and are using a secure (HTTPS) connection.");
    } finally {
      setIsInitializing(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      const context = canvas.getContext('2d');
      if (context) {
        // Use the smaller dimension to create a square crop from the center
        const size = Math.min(video.videoWidth, video.videoHeight);
        const xOffset = (video.videoWidth - size) / 2;
        const yOffset = (video.videoHeight - size) / 2;

        canvas.width = 1024;
        canvas.height = 1024;
        
        // Mirror the context if using front camera
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
        
        context.drawImage(video, xOffset, yOffset, size, size, 0, 0, 1024, 1024);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `capture_${Date.now()}.jpg`, { type: "image/jpeg" });
            onCapture(file);
            onOpenChange(false);
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-black border-none rounded-3xl">
        <DialogHeader className="p-4 bg-white shrink-0">
          <DialogTitle className="text-center font-black uppercase tracking-tight">Capture Profile Photo</DialogTitle>
        </DialogHeader>
        
        <div className="relative aspect-square flex items-center justify-center bg-zinc-900">
          {error ? (
            <div className="p-6">
                <Alert variant="destructive" className="bg-destructive/10 border-none">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Camera Error</AlertTitle>
                    <AlertDescription className="text-xs">
                        {error}
                    </AlertDescription>
                </Alert>
                <Button variant="outline" className="w-full mt-4 text-white border-white/20 hover:bg-white/10" onClick={startCamera}>
                    Try Again
                </Button>
            </div>
          ) : (
            <>
                <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
                />
                {isInitializing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <RefreshCw className="h-8 w-8 text-white animate-spin" />
                    </div>
                )}
            </>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <DialogFooter className="p-6 bg-white flex flex-row items-center justify-center gap-6">
          <Button 
            variant="outline" 
            size="icon" 
            className="rounded-full h-12 w-12 border-2" 
            onClick={() => onOpenChange(false)}
          >
            <X className="h-6 w-6" />
          </Button>
          
          <Button 
            size="icon" 
            className="rounded-full h-20 w-20 bg-primary shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-transform" 
            onClick={capturePhoto}
            disabled={!stream || isInitializing}
          >
            <Camera className="h-10 w-10" />
          </Button>
          
          <Button 
            variant="outline" 
            size="icon" 
            className="rounded-full h-12 w-12 border-2" 
            onClick={startCamera}
            disabled={isInitializing}
          >
            <RefreshCw className={`h-6 w-6 ${isInitializing ? 'animate-spin' : ''}`} />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
