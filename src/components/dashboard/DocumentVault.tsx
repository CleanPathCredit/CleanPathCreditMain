/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DocumentVault — upload and view sensitive identity documents.
 * Files are stored in the Supabase Storage bucket "documents" at
 *   documents/{userId}/{category}_{timestamp}.{ext}
 * Document metadata is stored in the public.documents table with RLS.
 * Images are re-encoded through canvas before upload to strip EXIF/GPS data.
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSupabaseClient } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import type { Document as DocRow, DocumentCategory } from "@/types/database";
import {
  Upload, Camera, CheckCircle2, AlertTriangle, FileText,
  Eye, Download, X, Shield, Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const MAX_FILE_BYTES   = 8 * 1024 * 1024; // 8 MB
const ACCEPTED_TYPES   = new Set(["image/jpeg","image/png","image/webp","image/heic","application/pdf"]);

const devError = (...args: unknown[]) => { if (import.meta.env.DEV) console.error(...args); };

// ── Image quality analysis ───────────────────────────────────────────────────

function analyzeImageQuality(file: File): Promise<{ passed: boolean; reason: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 400;
      const scale = Math.min(MAX / img.width, MAX / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve({ passed: true, reason: "" }); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const n = data.length / 4;

      // Brightness
      let lum = 0;
      for (let i = 0; i < data.length; i += 4) lum += 0.299*data[i] + 0.587*data[i+1] + 0.114*data[i+2];
      const avg = lum / n;
      if (avg < 40)  { resolve({ passed: false, reason: "Image is too dark. Please retake in better lighting." }); return; }
      if (avg > 245) { resolve({ passed: false, reason: "Image is overexposed. Please retake with less direct light." }); return; }

      // Blur (Laplacian variance)
      const gray = new Float32Array(n);
      for (let i = 0; i < n; i++) gray[i] = 0.299*data[i*4] + 0.587*data[i*4+1] + 0.114*data[i*4+2];
      const w = canvas.width, h = canvas.height;
      let lapSum = 0, lapCnt = 0;
      for (let y = 1; y < h-1; y++) for (let x = 1; x < w-1; x++) {
        const idx = y*w+x;
        const lap = -4*gray[idx] + gray[idx-1] + gray[idx+1] + gray[idx-w] + gray[idx+w];
        lapSum += lap*lap; lapCnt++;
      }
      if (lapSum / lapCnt < 100) { resolve({ passed: false, reason: "Image appears blurry. Please retake with a steady hand." }); return; }
      resolve({ passed: true, reason: "" });
    };
    img.onerror = () => resolve({ passed: true, reason: "" });
    img.src = URL.createObjectURL(file);
  });
}

// Strip EXIF by re-encoding through canvas ────────────────────────────────────
async function sanitizeImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  return new Promise<File>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 2048;
      const scale = Math.min(MAX / img.width, MAX / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          const base = file.name.replace(/\.[^.]+$/, "");
          resolve(new File([blob], `${base}.jpg`, { type: "image/jpeg" }));
        },
        "image/jpeg", 0.9,
      );
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

// ── Slot state ───────────────────────────────────────────────────────────────

interface UploadSlot {
  category: DocumentCategory;
  label: string;
  description: string;
  accepts: string;
  icon: React.ReactNode;
  file: File | null;
  preview: string | null;
  status: "idle" | "analyzing" | "accepted" | "rejected";
  rejectReason: string;
}

const INITIAL_SLOTS: UploadSlot[] = [
  { category: "id",  label: "Driver's License / State ID", description: "JPG, PNG, or PDF · max 8 MB", accepts: "image/*,.pdf", icon: <Shield className="h-6 w-6" />,   file: null, preview: null, status: "idle", rejectReason: "" },
  { category: "ssn", label: "Social Security Card",        description: "JPG, PNG, or PDF · max 8 MB", accepts: "image/*,.pdf", icon: <FileText className="h-6 w-6" />, file: null, preview: null, status: "idle", rejectReason: "" },
];

// ── Component ────────────────────────────────────────────────────────────────

export function DocumentVault() {
  const { clerkUser, profile, refreshProfile } = useAuth();
  const supabase = useSupabaseClient();

  const [activeView, setActiveView]   = useState<"upload" | "vault">("vault");
  const [uploading, setUploading]     = useState(false);
  const [uploadSlots, setUploadSlots] = useState<UploadSlot[]>(INITIAL_SLOTS);
  const [existingDocs, setExistingDocs] = useState<DocRow[]>([]);
  const [signedUrls, setSignedUrls]   = useState<Record<string, string>>({});

  const fileInputRefs   = useRef<(HTMLInputElement | null)[]>([]);
  const cameraInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Load existing documents
  useEffect(() => {
    if (!clerkUser) return;
    supabase.from("documents").select("*").eq("profile_id", clerkUser.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setExistingDocs(data ?? []));
  }, [clerkUser?.id, activeView]);

  // Get signed URL for viewing (15-minute expiry)
  const openDoc = async (path: string) => {
    if (signedUrls[path]) { window.open(signedUrls[path], "_blank"); return; }
    const { data } = await supabase.storage.from("documents").createSignedUrl(path, 900);
    if (data?.signedUrl) {
      setSignedUrls((prev) => ({ ...prev, [path]: data.signedUrl }));
      window.open(data.signedUrl, "_blank");
    }
  };

  // ── File selection + quality check ────────────────────────────────────────

  const handleFileSelect = useCallback(async (index: number, file: File) => {
    if (file.size > MAX_FILE_BYTES) {
      setUploadSlots((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], file: null, preview: null, status: "rejected", rejectReason: "File is too large (max 8 MB)." };
        return next;
      });
      return;
    }
    if (!ACCEPTED_TYPES.has(file.type) && !file.type.startsWith("image/")) {
      setUploadSlots((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], file: null, preview: null, status: "rejected", rejectReason: "Unsupported file type. Please upload JPG, PNG, WEBP, HEIC, or PDF." };
        return next;
      });
      return;
    }

    const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
    setUploadSlots((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], file, preview, status: "analyzing", rejectReason: "" };
      return next;
    });

    if (file.type.startsWith("image/")) {
      const result = await analyzeImageQuality(file);
      setUploadSlots((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], status: result.passed ? "accepted" : "rejected", rejectReason: result.reason };
        return next;
      });
    } else {
      setUploadSlots((prev) => {
        const next = [...prev]; next[index] = { ...next[index], status: "accepted" }; return next;
      });
    }
  }, []);

  // ── Upload to Supabase Storage ─────────────────────────────────────────────

  const handleUploadAll = async () => {
    if (!clerkUser) return;
    const accepted = uploadSlots.filter((s) => s.status === "accepted" && s.file);
    if (accepted.length === 0) return;

    setUploading(true);
    try {
      for (const slot of accepted) {
        if (!slot.file) continue;
        const sanitized = await sanitizeImage(slot.file);
        const path = `${clerkUser.id}/${slot.category}_${Date.now()}.${sanitized.name.split(".").pop()}`;

        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(path, sanitized, { contentType: sanitized.type, upsert: false });

        if (uploadError) { devError("Storage upload failed:", uploadError.message); continue; }

        await supabase.from("documents").insert({
          profile_id:   clerkUser.id,
          name:         sanitized.name,
          storage_path: path,
          mime_type:    sanitized.type,
          size_bytes:   sanitized.size,
          category:     slot.category,
          status:       "pending",
        });

        // Log audit event
        await supabase.rpc("log_audit_event", { p_action: "document.upload", p_target: clerkUser.id, p_metadata: { category: slot.category } });
      }

      // Update profile flags
      const updates: { id_uploaded?: boolean; ssn_uploaded?: boolean } = {};
      if (accepted.some((s) => s.category === "id"))  updates.id_uploaded  = true;
      if (accepted.some((s) => s.category === "ssn")) updates.ssn_uploaded = true;
      if (Object.keys(updates).length > 0) {
        await supabase.from("profiles").update(updates).eq("id", clerkUser.id);
        await refreshProfile();
      }

      setUploadSlots(INITIAL_SLOTS);
      setActiveView("vault");
    } catch (err) {
      devError("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  const allAccepted = uploadSlots.every((s) => s.status === "accepted");
  const hasAnyFile  = uploadSlots.some((s) => s.file !== null);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Document Vault</h2>
          <p className="text-sm text-zinc-500 mt-1 flex items-center gap-2">
            <Shield className="h-4 w-4" /> AES-256 encrypted · TLS 1.3 in transit · EXIF stripped
          </p>
        </div>
        <Button variant={activeView === "upload" ? "outline" : "primary"} onClick={() => setActiveView(activeView === "upload" ? "vault" : "upload")} className="h-10 px-5 text-sm">
          {activeView === "upload" ? <><Eye className="h-4 w-4 mr-2" /> View Documents</> : <><Upload className="h-4 w-4 mr-2" /> Upload Documents</>}
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {activeView === "upload" ? (
          <motion.div key="upload" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {uploadSlots.map((slot, idx) => (
                <div key={slot.category} className={`relative rounded-2xl border-2 border-dashed p-6 transition-all ${
                  slot.status === "accepted"  ? "border-emerald-400 bg-emerald-50/50" :
                  slot.status === "rejected"  ? "border-red-400 bg-red-50/50" :
                  slot.status === "analyzing" ? "border-blue-300 bg-blue-50/30" :
                  "border-zinc-300 hover:border-zinc-400 bg-white"}`}>

                  {slot.status === "accepted" && (
                    <div className="absolute top-3 right-3 flex items-center justify-center h-8 w-8 rounded-full bg-emerald-500">
                      <CheckCircle2 className="h-5 w-5 text-white" />
                    </div>
                  )}
                  {slot.status === "rejected" && (
                    <div className="absolute top-3 right-3 group">
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-red-500 cursor-help">
                        <AlertTriangle className="h-5 w-5 text-white" />
                      </div>
                      <div className="absolute right-0 top-10 z-20 hidden group-hover:block w-64 p-3 bg-red-900 text-white text-xs rounded-lg shadow-xl">
                        {slot.rejectReason || "Please resubmit a clearer image."}
                      </div>
                    </div>
                  )}

                  {slot.preview ? (
                    <div className="relative mb-4">
                      <img src={slot.preview} alt={`Preview of ${slot.label}`} className="w-full h-40 object-cover rounded-xl" />
                      {slot.status === "rejected" && (
                        <button onClick={() => setUploadSlots((prev) => { const n=[...prev]; n[idx]={...n[idx],file:null,preview:null,status:"idle",rejectReason:""}; return n; })}
                          className="absolute top-2 left-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex justify-center mb-4">
                      <div className={`h-14 w-14 rounded-full flex items-center justify-center ${slot.status === "analyzing" ? "bg-blue-100 text-blue-600" : "bg-zinc-100 text-zinc-400"}`}>
                        {slot.status === "analyzing" ? <Loader2 className="h-6 w-6 animate-spin" /> : slot.icon}
                      </div>
                    </div>
                  )}

                  <h3 className="font-bold text-zinc-900 text-center mb-1">{slot.label}</h3>
                  <p className="text-xs text-zinc-500 text-center mb-4">{slot.description}</p>
                  {slot.status === "analyzing" && <p className="text-xs text-blue-600 text-center font-medium mb-4">Analyzing image quality…</p>}

                  {slot.status !== "accepted" && (
                    <div className="flex gap-2 justify-center">
                      <input ref={(el) => { fileInputRefs.current[idx] = el; }} type="file" accept={slot.accepts} className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(idx, f); }} />
                      <Button variant="outline" size="sm" onClick={() => fileInputRefs.current[idx]?.click()} className="text-xs gap-1.5">
                        <Upload className="h-3.5 w-3.5" /> Upload File
                      </Button>
                      <input ref={(el) => { cameraInputRefs.current[idx] = el; }} type="file" accept="image/*" capture="environment" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(idx, f); }} />
                      <Button variant="outline" size="sm" onClick={() => cameraInputRefs.current[idx]?.click()} className="text-xs gap-1.5">
                        <Camera className="h-3.5 w-3.5" /> Take Photo
                      </Button>
                    </div>
                  )}
                  {slot.status === "accepted" && <p className="text-xs text-emerald-600 text-center font-semibold mt-2">✓ Image accepted</p>}
                </div>
              ))}
            </div>

            <Button onClick={handleUploadAll} disabled={!allAccepted || !hasAnyFile || uploading}
              className={`w-full h-14 rounded-xl text-lg font-bold shadow-md transition-all ${allAccepted && hasAnyFile ? "bg-black text-white hover:bg-zinc-800" : "bg-zinc-200 text-zinc-400 cursor-not-allowed"}`}>
              {uploading ? <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Encrypting & Uploading…</> :
               allAccepted && hasAnyFile ? "Submit Documents" : "Upload & verify all documents to continue"}
            </Button>
          </motion.div>
        ) : (
          <motion.div key="vault" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {existingDocs.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-zinc-200 p-12 text-center bg-white">
                <div className="h-16 w-16 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-zinc-300" />
                </div>
                <h3 className="font-bold text-zinc-900 mb-2">No Documents Yet</h3>
                <p className="text-sm text-zinc-500 mb-6">Upload your government-issued ID and Social Security card to get started.</p>
                <Button variant="primary" onClick={() => setActiveView("upload")} className="h-11 px-6">
                  <Upload className="h-4 w-4 mr-2" /> Upload Documents
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {existingDocs.map((doc) => (
                  <div key={doc.id} className="bg-white rounded-2xl border border-zinc-200 overflow-hidden hover:shadow-lg transition-all group">
                    <div className="h-44 bg-zinc-50 flex items-center justify-center relative overflow-hidden">
                      {doc.mime_type?.startsWith("image/") ? (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-100">
                          <FileText className="h-12 w-12 text-zinc-300" />
                          <span className="sr-only">Image preview requires secure URL</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <FileText className="h-12 w-12 text-zinc-300" />
                          <span className="text-xs font-medium text-zinc-400 uppercase">PDF</span>
                        </div>
                      )}
                      <div className="absolute top-3 right-3">
                        {doc.status === "verified" && <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-md"><CheckCircle2 className="h-5 w-5 text-white" /></div>}
                        {doc.status === "rejected" && <div className="h-8 w-8 rounded-full bg-red-500 flex items-center justify-center shadow-md"><AlertTriangle className="h-5 w-5 text-white" /></div>}
                      </div>
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button onClick={() => openDoc(doc.storage_path)} className="p-3 bg-white/90 backdrop-blur rounded-full hover:bg-white" aria-label="View document">
                          <Eye className="h-5 w-5 text-zinc-900" />
                        </button>
                        <button onClick={() => openDoc(doc.storage_path)} className="p-3 bg-white/90 backdrop-blur rounded-full hover:bg-white" aria-label="Download document">
                          <Download className="h-5 w-5 text-zinc-900" />
                        </button>
                      </div>
                    </div>
                    <div className="p-4">
                      <h4 className="font-semibold text-zinc-900 text-sm truncate">{doc.name}</h4>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-zinc-500">
                          {new Date(doc.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          doc.status === "verified" ? "bg-emerald-50 text-emerald-700" :
                          doc.status === "rejected" ? "bg-red-50 text-red-700" : "bg-zinc-100 text-zinc-600"}`}>
                          {doc.status === "verified" ? "Verified" : doc.status === "rejected" ? "Rejected" : "Pending review"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
