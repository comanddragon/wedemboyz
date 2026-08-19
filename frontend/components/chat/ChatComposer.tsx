"use client";

import { FileText, Image as ImageIcon, Paperclip, Send, X } from "lucide-react";
import { useRef, useState } from "react";

import {
    CHAT_ATTACHMENT_ALLOWED_TYPES,
    CHAT_ATTACHMENT_MAX_COUNT,
    CHAT_ATTACHMENT_MAX_SIZE_BYTES,
} from "@/lib/constants";

export interface ChatComposerSubmission {
    content: string;
    attachments: File[];
}

/** Text + attachment composer shared by the customer and admin chat room
 * screens. Attachments are validated client-side against the same limits
 * the backend enforces (apps.chat.constants) so a bad file gets caught
 * before an upload round-trip. Sending — with or without files — is left
 * to the caller (see `onSend`), since whether it goes over the socket or
 * REST depends on connection state the composer doesn't know about. */
export function ChatComposer({
    onSend,
    isSending,
    error,
}: {
    onSend: (submission: ChatComposerSubmission) => void;
    isSending: boolean;
    error?: string | null;
}) {
    const [draft, setDraft] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [localError, setLocalError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
        const selected = Array.from(e.target.files ?? []);
        e.target.value = ""; // allow re-selecting the same file after removing it
        if (selected.length === 0) return;

        const combined = [...files, ...selected];
        if (combined.length > CHAT_ATTACHMENT_MAX_COUNT) {
            setLocalError(`You can attach up to ${CHAT_ATTACHMENT_MAX_COUNT} files per message.`);
            return;
        }
        for (const file of selected) {
            if (file.size > CHAT_ATTACHMENT_MAX_SIZE_BYTES) {
                setLocalError(`"${file.name}" is too large — max ${CHAT_ATTACHMENT_MAX_SIZE_BYTES / (1024 * 1024)}MB.`);
                return;
            }
            if (!CHAT_ATTACHMENT_ALLOWED_TYPES.includes(file.type as (typeof CHAT_ATTACHMENT_ALLOWED_TYPES)[number])) {
                setLocalError(`"${file.name}" isn't a supported file type — photos or PDFs only.`);
                return;
            }
        }

        setLocalError(null);
        setFiles(combined);
    }

    function removeFile(index: number) {
        setFiles((prev) => prev.filter((_, i) => i !== index));
        setLocalError(null);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const content = draft.trim();
        if (!content && files.length === 0) return;

        onSend({ content, attachments: files });
        setDraft("");
        setFiles([]);
        setLocalError(null);
    }

    const displayError = localError ?? error;
    const canSubmit = !isSending && (draft.trim().length > 0 || files.length > 0);

    return (
        <div className="border-t border-crease bg-white">
            {files.length > 0 && (
                <div className="flex flex-wrap gap-2 px-4 pt-3">
                    {files.map((file, index) => (
                        <span
                            key={`${file.name}-${index}`}
                            className="flex items-center gap-1.5 rounded-full bg-steam py-1 pl-3 pr-1.5 text-xs text-ink"
                        >
                            {file.type.startsWith("image/") ? (
                                <ImageIcon className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
                            ) : (
                                <FileText className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
                            )}
                            <span className="max-w-[120px] truncate">{file.name}</span>
                            <button
                                type="button"
                                onClick={() => removeFile(index)}
                                className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-crease hover:text-ink"
                                aria-label={`Remove ${file.name}`}
                            >
                                <X className="h-3 w-3" aria-hidden="true" />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {displayError && <p className="px-4 pt-2 text-xs text-status-cancelled-text">{displayError}</p>}

            <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-3">
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={CHAT_ATTACHMENT_ALLOWED_TYPES.join(",")}
                    onChange={handleFilesSelected}
                    className="hidden"
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSending || files.length >= CHAT_ATTACHMENT_MAX_COUNT}
                    title="Attach a photo or PDF"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-steam hover:text-navy disabled:cursor-not-allowed disabled:opacity-40"
                >
                    <Paperclip className="h-4 w-4" aria-hidden="true" />
                </button>
                <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 rounded-full border border-crease bg-paper px-4 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                />
                <button
                    type="submit"
                    disabled={!canSubmit}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy text-white transition-colors hover:bg-navy-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    <Send className="h-4 w-4" aria-hidden="true" />
                </button>
            </form>
        </div>
    );
}
