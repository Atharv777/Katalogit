/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Camera, Upload, Check, Loader2, AlertCircle, Image } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LanguageSelect, useLanguage } from '../lib/language';

interface MobileUploadProps {
  sessionId: string;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export default function MobileUpload({ sessionId }: MobileUploadProps) {
  const { t } = useLanguage();
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [preview, setPreview] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (base64Str: string, maxWidth = 1200, quality = 0.75): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > height) {
          if (width > maxWidth) { height = Math.round(height * maxWidth / width); width = maxWidth; }
        } else {
          if (height > maxWidth) { width = Math.round(width * maxWidth / height); height = maxWidth; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(base64Str);
    });
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select an image file.');
      setUploadState('error');
      return;
    }

    setUploadState('uploading');

    // First verify the session is reachable
    try {
      const origin = window.location.origin;
      const check = await fetch(`${origin}/api/mobile-session/${sessionId}`);
      if (check.status === 404) {
        setErrorMsg(`Session "${sessionId}" not found or expired. Scan the QR code again.`);
        setUploadState('error');
        return;
      }
    } catch (err) {
      setErrorMsg(`Cannot reach server at ${window.location.origin}. Check you are on the same Wi-Fi.`);
      setUploadState('error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const raw = e.target?.result as string;
      const compressed = await compressImage(raw);
      setPreview(compressed);
      await uploadImage(compressed);
    };
    reader.readAsDataURL(file);
  };

  const uploadImage = async (imageData: string) => {
    setUploadState('uploading');
    try {
      // Use absolute URL with the origin the page was loaded from
      // so it works whether the phone loaded via LAN IP or localhost
      const origin = window.location.origin;
      const res = await fetch(`${origin}/api/mobile-upload/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server returned ${res.status}: ${text}`);
      }
      setUploadState('success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`Upload failed: ${msg}`);
      setUploadState('error');
    }
  };

  const reset = () => {
    setUploadState('idle');
    setPreview(null);
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6">
      <div className="mobile-language"><LanguageSelect /></div>
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 shadow-lg shadow-indigo-900">
          K
        </div>
        <h1 className="text-2xl font-bold tracking-tight">KatalogitAI</h1>
        <p className="text-gray-400 text-sm mt-1">{t("Mobile Product Upload")}</p>
      </div>

      <AnimatePresence mode="wait">
        {uploadState === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="w-full max-w-sm space-y-4"
          >
            <p className="text-center text-gray-400 text-sm mb-6">
              {t("Take a photo or choose one from your gallery. It'll appear in the desktop Review Center automatically.")}
            </p>

            {/* Camera button */}
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-3 py-5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-indigo-900"
            >
              <Camera size={24} />
              {t("Take Photo")}
            </button>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />

            {/* Gallery button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-3 py-5 bg-gray-800 hover:bg-gray-700 active:scale-95 rounded-2xl font-bold text-lg transition-all border border-gray-700"
            >
              <Image size={24} />
              {t("Choose from Gallery")}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />

            <p className="text-center text-gray-600 text-xs pt-2">
              Session: <span className="font-mono text-gray-500">{sessionId}</span>
              <br />
              <span className="font-mono text-gray-600">{typeof window !== 'undefined' ? window.location.origin : ''}</span>
            </p>
          </motion.div>
        )}

        {uploadState === 'uploading' && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-sm flex flex-col items-center gap-6"
          >
            {preview && (
              <div className="w-48 h-48 rounded-2xl overflow-hidden border border-gray-700 shadow-xl">
                <img src={preview} className="w-full h-full object-cover" alt="" />
              </div>
            )}
            <div className="flex items-center gap-3 text-gray-300">
              <Loader2 size={24} className="animate-spin text-indigo-400" />
              <span className="font-medium">{t("Sending to catalog...")}</span>
            </div>
          </motion.div>
        )}

        {uploadState === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-sm flex flex-col items-center gap-6 text-center"
          >
            {preview && (
              <div className="w-48 h-48 rounded-2xl overflow-hidden border-2 border-green-500 shadow-xl shadow-green-900/30">
                <img src={preview} className="w-full h-full object-cover" alt="" />
              </div>
            )}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 12 }}
              className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-900/50"
            >
              <Check size={32} />
            </motion.div>
            <div>
              <h2 className="text-xl font-bold">{t("Photo Sent!")}</h2>
              <p className="text-gray-400 text-sm mt-1">
                {t("AI is analyzing it now. Check the Review Center on your desktop.")}
              </p>
            </div>
            <button
              onClick={reset}
              className="w-full py-4 bg-gray-800 hover:bg-gray-700 rounded-2xl font-bold transition-all border border-gray-700"
            >
              {t("Upload Another")}
            </button>
          </motion.div>
        )}

        {uploadState === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-sm flex flex-col items-center gap-6 text-center"
          >
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
              <AlertCircle size={32} className="text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-red-400">{t("Upload Failed")}</h2>
              <p className="text-gray-400 text-sm mt-2">{errorMsg}</p>
            </div>
            <button
              onClick={reset}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 rounded-2xl font-bold transition-all"
            >
              {t("Try Again")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
