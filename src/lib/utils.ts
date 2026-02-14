import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function compressImage(file: File, options: { maxWidth: number; quality: number }): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    const reader = new FileReader();

    reader.onload = (e) => {
      if (typeof e.target?.result !== 'string') {
        return reject(new Error('FileReader did not return a string.'));
      }
      img.src = e.target.result;
    };

    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      if (width > options.maxWidth) {
        const ratio = width / height;
        width = options.maxWidth;
        height = width / ratio;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Could not get canvas context for image compression.'));
      }
      
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return reject(new Error('Canvas to Blob conversion failed during compression.'));
          }
          resolve(blob);
        },
        'image/jpeg',
        options.quality
      );
    };

    img.onerror = (error) => reject(error);
    reader.onerror = (error) => reject(error);
    reader.onabort = () => reject(new Error('File reading was aborted.'));

    reader.readAsDataURL(file);
  });
}
