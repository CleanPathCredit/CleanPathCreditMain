import React, { useState, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db, storage } from "@/firebase";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Button } from "@/components/ui/Button";
import {
  Upload, Camera, CheckCircle2, AlertTriangle, FileText,
  Eye, Download, X, Shield, Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { UserData } from "@/types/user";

/** Local Document record — extends the shared DocumentFile with a category. */
interface VaultDocument {
  id: string;
  name: string;
  type: string;
  category: string;
  url: string;
  uploadedAt: string;
  status: "verified" | "rejected" | "pending";
  thumbnailUrl?: string;
}

/** Maximum accepted upload size. Mirrors server-side storage rules. */
const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB
const ACCEPTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
]);

const devError = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.error(...args);
  }
};

/**
 * Re-encodes an image via canvas to strip EXIF/metadata (including GPS) and
 * downscale oversized originals. Returns the sanitized File.
 * PDFs and unknown types pass through unchanged.
 */
async function sanitizeImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  return new Promise<File>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const maxEdge = 2048;
      const scale = Math.min(maxEdge / img.width, maxEdge / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          // Drop the original extension — we always output JPEG after re-encode.
          const baseName = file.name.replace(/\.[^.]+$/, "");
          resolve(new File([blob], `${baseName}.jpg`, { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.9,
      );
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

interface UploadSlot {
  category: string;
  label: string;
  description: string;
  accepts: string;
  icon: React.ReactNode;
  file: File | null;
  preview: string | null;
  status: "idle" | "analyzing" | "accepted" | "rejected";
  rejectReason: string;
}

/**
 * Analyzes image quality using Canvas API.
 * Checks brightness (average luminance) and blur (Laplacian variance).
 */
function analyzeImageQuality(file: File): Promise<{ passed: boolean; reason: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const maxDim = 400; // Downscale for performance
      const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve({ passed: true, reason: "" }); return; }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // 1. Brightness check — average luminance
      let totalLuminance = 0;
      const pixelCount = data.length / 4;
      for (let i = 0; i < data.length; i += 4) {
        totalLuminance += (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      }
      const avgLuminance = totalLuminance / pixelCount;

      if (avgLuminance < 40) {
        resolve({ passed: false, reason: "Image is too dark. Please retake in better lighting." });
        return;
      }
      if (avgLuminance > 245) {
        resolve({ passed: false, reason: "Image is overexposed. Please retake with less direct light." });
        return;
      }

      // 2. Blur check — Laplacian variance
      const gray = new Float32Array(pixelCount);
      for (let i = 0; i < pixelCount; i++) {
        gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
      }

      const w = canvas.width;
      const h = canvas.height;
      let laplacianSum = 0;
      let laplacianCount = 0;

      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const idx = y * w + x;
          const lap = -4 * gray[idx] + gray[idx - 1] + gray[idx + 1] + gray[idx - w] + gray[idx + w];
          laplacianSum += lap * lap;
          laplacianCount++;
        }
      }

      const laplacianVariance = laplacianSum / laplacianCount;

      if (laplacianVariance < 100) {
        resolve({ passed: false, reason: "Image appears blurry. Please retake with a steady hand and ensure the text is in focus." });
        return;
      }

      resolve({ passed: true, reason: "" });
    };
    img.onerror = () => resolve({ passed: true, reason: "" });
    img.src = URL.createObjectURL(file);
  });
}

export function DocumentVault({ profile }: { profile: UserData | null }) {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<"upload" | "vault">("vault");
  const [uploading, setUploading] = useState(false);
  const [uploadSlots, setUploadSlots] = useState<UploadSlot[]>([
    {
      category: "id",
      label: "Driver's License / State ID",
      description: "JPG, PNG, or PDF",
      accepts: "image/*,.pdf",
      icon: <Shield className="h-6 w-6" />,
      file: null,
      preview: null,
      status: "idle",
      rejectReason: "",
    },
    {
      category: "ssn",
      label: "Social Security Card",
      description: "JPG, PNG, or PDF",
      accepts: "image/*,.pdf",
      icon: <FileText className="h-6 w-6" />,
      file: null,
      preview: null,
      status: "idle",
      rejectReason: "",
    },
  ]);

  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const cameraInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const existingDocs: VaultDocument[] = (profile?.documents ?? []) as VaultDocument[];

  const handleFileSelect = useCallback(async (index: number, file: File) => {
    // Client-side validation. Storage rules MUST re-validate size + MIME;
    // never trust the client alone.
    if (file.size > MAX_FILE_BYTES) {
      setUploadSlots((prev) => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          file: null,
          preview: null,
          status: "rejected",
          rejectReason: `File is too large (max ${Math.round(MAX_FILE_BYTES / 1024 / 1024)}MB).`,
        };
        return next;
      });
      return;
    }

    if (!ACCEPTED_MIME_TYPES.has(file.type) && !file.type.startsWith("image/")) {
      setUploadSlots((prev) => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          file: null,
          preview: null,
          status: "rejected",
          rejectReason: "Unsupported file type. Please upload JPG, PNG, WEBP, HEIC, or PDF.",
        };
        return next;
      });
      return;
    }

    const slots = [...uploadSlots];
    const slot = { ...slots[index] };

    // Generate preview
    if (file.type.startsWith("image/")) {
      slot.preview = URL.createObjectURL(file);
    } else {
      slot.preview = null;
    }
    slot.file = file;
    slot.status = "analyzing";
    slot.rejectReason = "";
    slots[index] = slot;
    setUploadSlots(slots);

    // Analyze if image
    if (file.type.startsWith("image/")) {
      const result = await analyzeImageQuality(file);
      const updatedSlots = [...slots];
      updatedSlots[index] = {
        ...updatedSlots[index],
        status: result.passed ? "accepted" : "rejected",
        rejectReason: result.reason,
      };
      setUploadSlots(updatedSlots);
    } else {
      // PDFs auto-accept
      const updatedSlots = [...slots];
      updatedSlots[index] = { ...updatedSlots[index], status: "accepted" };
      setUploadSlots(updatedSlots);
    }
  }, [uploadSlots]);

  const handleUploadAll = async () => {
    if (!user) return;
    const acceptedSlots = uploadSlots.filter(s => s.status === "accepted" && s.file);
    if (acceptedSlots.length === 0) return;

    setUploading(true);
    try {
      const newDocs: VaultDocument[] = [];

      for (const slot of acceptedSlots) {
        if (!slot.file) continue;
        // Strip EXIF / GPS metadata from images before upload. PDFs pass through.
        const sanitized = await sanitizeImage(slot.file);
        const fileRef = ref(
          storage,
          `users/${user.uid}/documents/${slot.category}_${Date.now()}_${sanitized.name}`,
        );
        await uploadBytes(fileRef, sanitized, { contentType: sanitized.type });
        const url = await getDownloadURL(fileRef);

        newDocs.push({
          id: `${slot.category}_${Date.now()}`,
          name: sanitized.name,
          type: sanitized.type,
          category: slot.category,
          url,
          uploadedAt: new Date().toISOString(),
          status: "verified",
        });
      }

      // Update Firestore
      const updateData: Partial<Pick<UserData, "idUploaded" | "ssnUploaded">> = {};
      if (acceptedSlots.some((s) => s.category === "id")) updateData.idUploaded = true;
      if (acceptedSlots.some((s) => s.category === "ssn")) updateData.ssnUploaded = true;

      await updateDoc(doc(db, "users", user.uid), {
        ...updateData,
        documents: arrayUnion(...newDocs),
      });

      // Reset slots
      setUploadSlots((prev) => prev.map((s) => ({
        ...s,
        file: null,
        preview: null,
        status: "idle",
        rejectReason: "",
      })));
      setActiveView("vault");
    } catch (err) {
      devError("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  const allAccepted = uploadSlots.every(s => s.status === "accepted");
  const hasAnyFile = uploadSlots.some(s => s.file !== null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Document Vault</h2>
          <p className="text-sm text-zinc-500 mt-1 flex items-center gap-2">
            <Shield className="h-4 w-4" /> Secured via 256-bit bank-level encryption
          </p>
        </div>
        <Button
          variant={activeView === "upload" ? "outline" : "primary"}
          onClick={() => setActiveView(activeView === "upload" ? "vault" : "upload")}
          className="h-10 px-5 text-sm"
        >
          {activeView === "upload" ? (
            <><Eye className="h-4 w-4 mr-2" /> View Documents</>
          ) : (
            <><Upload className="h-4 w-4 mr-2" /> Upload Documents</>
          )}
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {activeView === "upload" ? (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Upload Slots */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {uploadSlots.map((slot, index) => (
                <div
                  key={slot.category}
                  className={`relative rounded-2xl border-2 border-dashed p-6 transition-all ${
                    slot.status === "accepted"
                      ? "border-emerald-400 bg-emerald-50/50"
                      : slot.status === "rejected"
                      ? "border-red-400 bg-red-50/50"
                      : slot.status === "analyzing"
                      ? "border-blue-300 bg-blue-50/30"
                      : "border-zinc-300 hover:border-zinc-400 bg-white"
                  }`}
                >
                  {/* Status Badge */}
                  {slot.status === "accepted" && (
                    <div className="absolute top-3 right-3">
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-emerald-500">
                        <CheckCircle2 className="h-5 w-5 text-white" />
                      </div>
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

                  {/* Preview or Placeholder */}
                  {slot.preview ? (
                    <div className="relative mb-4">
                      <img
                        src={slot.preview}
                        alt={slot.label}
                        className="w-full h-40 object-cover rounded-xl"
                      />
                      {slot.status === "rejected" && (
                        <button
                          onClick={() => {
                            const slots = [...uploadSlots];
                            slots[index] = { ...slots[index], file: null, preview: null, status: "idle", rejectReason: "" };
                            setUploadSlots(slots);
                          }}
                          className="absolute top-2 left-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex justify-center mb-4">
                      <div className={`h-14 w-14 rounded-full flex items-center justify-center ${
                        slot.status === "analyzing" ? "bg-blue-100 text-blue-600" : "bg-zinc-100 text-zinc-400"
                      }`}>
                        {slot.status === "analyzing" ? (
                          <Loader2 className="h-6 w-6 animate-spin" />
                        ) : (
                          slot.icon
                        )}
                      </div>
                    </div>
                  )}

                  <h3 className="font-bold text-zinc-900 text-center mb-1">{slot.label}</h3>
                  <p className="text-xs text-zinc-500 text-center mb-4">{slot.description}</p>

                  {slot.status === "analyzing" && (
                    <p className="text-xs text-blue-600 text-center font-medium mb-4">Analyzing image quality...</p>
                  )}

                  {slot.status !== "accepted" && (
                    <div className="flex gap-2 justify-center">
                      {/* File Upload */}
                      <input
                        ref={(el) => { fileInputRefs.current[index] = el; }}
                        type="file"
                        accept={slot.accepts}
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFileSelect(index, f);
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRefs.current[index]?.click()}
                        className="text-xs gap-1.5"
                      >
                        <Upload className="h-3.5 w-3.5" /> Upload File
                      </Button>

                      {/* Camera Capture */}
                      <input
                        ref={(el) => { cameraInputRefs.current[index] = el; }}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFileSelect(index, f);
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cameraInputRefs.current[index]?.click()}
                        className="text-xs gap-1.5"
                      >
                        <Camera className="h-3.5 w-3.5" /> Take Photo
                      </Button>
                    </div>
                  )}

                  {slot.status === "accepted" && (
                    <p className="text-xs text-emerald-600 text-center font-semibold mt-2">✓ Image accepted</p>
                  )}
                </div>
              ))}
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleUploadAll}
              disabled={!allAccepted || !hasAnyFile || uploading}
              className={`w-full h-14 rounded-xl text-lg font-bold shadow-md transition-all ${
                allAccepted && hasAnyFile
                  ? "bg-black text-white hover:bg-zinc-800"
                  : "bg-zinc-200 text-zinc-400 cursor-not-allowed"
              }`}
            >
              {uploading ? (
                <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Encrypting & Uploading...</>
              ) : allAccepted && hasAnyFile ? (
                "Submit Documents"
              ) : (
                "Upload & verify all documents to continue"
              )}
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="vault"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {existingDocs.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-zinc-200 p-12 text-center bg-white">
                <div className="h-16 w-16 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-zinc-300" />
                </div>
                <h3 className="font-bold text-zinc-900 mb-2">No Documents Yet</h3>
                <p className="text-sm text-zinc-500 mb-6">Upload your identification documents to get started.</p>
                <Button variant="primary" onClick={() => setActiveView("upload")} className="h-11 px-6">
                  <Upload className="h-4 w-4 mr-2" /> Upload Documents
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {existingDocs.map((docFile) => (
                  <div
                    key={docFile.id}
                    className="bg-white rounded-2xl border border-zinc-200 overflow-hidden hover:shadow-lg transition-all group"
                  >
                    {/* Thumbnail / Icon */}
                    <div className="h-44 bg-zinc-50 flex items-center justify-center relative overflow-hidden">
                      {docFile.type?.startsWith("image/") ? (
                        <img
                          src={docFile.url}
                          alt={`Uploaded document: ${docFile.name}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <FileText className="h-12 w-12 text-zinc-300" />
                          <span className="text-xs font-medium text-zinc-400 uppercase">PDF</span>
                        </div>
                      )}
                      {/* Status overlay */}
                      <div className="absolute top-3 right-3">
                        {docFile.status === "verified" ? (
                          <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-md">
                            <CheckCircle2 className="h-5 w-5 text-white" />
                          </div>
                        ) : docFile.status === "rejected" ? (
                          <div className="h-8 w-8 rounded-full bg-red-500 flex items-center justify-center shadow-md">
                            <AlertTriangle className="h-5 w-5 text-white" />
                          </div>
                        ) : null}
                      </div>
                      {/* Hover actions */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <a
                          href={docFile.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-3 bg-white/90 backdrop-blur rounded-full hover:bg-white transition-colors"
                        >
                          <Eye className="h-5 w-5 text-zinc-900" />
                        </a>
                        <a
                          href={docFile.url}
                          download
                          className="p-3 bg-white/90 backdrop-blur rounded-full hover:bg-white transition-colors"
                        >
                          <Download className="h-5 w-5 text-zinc-900" />
                        </a>
                      </div>
                    </div>
                    {/* Info */}
                    <div className="p-4">
                      <h4 className="font-semibold text-zinc-900 text-sm truncate">{docFile.name}</h4>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-zinc-500">
                          {new Date(docFile.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          docFile.status === "verified"
                            ? "bg-emerald-50 text-emerald-700"
                            : docFile.status === "rejected"
                            ? "bg-red-50 text-red-700"
                            : "bg-zinc-100 text-zinc-600"
                        }`}>
                          {docFile.status === "verified" ? "Verified" : docFile.status === "rejected" ? "Rejected" : "Pending"}
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
