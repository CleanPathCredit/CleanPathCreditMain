/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = "admin" | "client";

export type ClientStatus =
  | "pending_connection"
  | "missing_id"
  | "ready_for_audit"
  | "audit_in_progress"
  | "audit_complete"
  | "disputes_drafted"
  | "disputes_sent"
  | "waiting_on_bureau"
  | "bureau_responded"
  | "results_received"
  | "complete";

export interface DocumentFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size?: number;
  uploadedAt: string;
  status?: "pending" | "verified" | "rejected";
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: "admin" | "client";
  timestamp: string;
}

/** Firestore document stored at /users/{uid}. */
export interface UserData {
  email: string;
  fullName?: string;
  phone?: string;
  address?: string;
  goal?: string;
  challenge?: string;
  role: UserRole;
  progress?: number;
  status?: ClientStatus;
  createdAt?: string;
  idUploaded?: boolean;
  ssnUploaded?: boolean;
  videoVerified?: boolean;
  documents?: DocumentFile[];
  messages?: ChatMessage[];
  negativeItems?: number;
  disputeProbability?: number;
}

/** UserData augmented with its Firestore document id for list views. */
export interface ClientRecord extends UserData {
  id: string;
}
