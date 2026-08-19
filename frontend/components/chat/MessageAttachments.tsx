import { FileText } from "lucide-react";

import type { MessageAttachment } from "@/types";

/** Renders a message's attachments inside a chat bubble — images as inline
 * thumbnails (tap to open full-size), everything else (PDFs) as a small
 * file chip. Mirrors apps.chat.api.serializers.room.MessageAttachmentSerializer. */
export function MessageAttachments({
    attachments,
    isMine,
}: {
    attachments: MessageAttachment[];
    isMine: boolean;
}) {
    if (attachments.length === 0) return null;

    return (
        <div className={`flex flex-wrap gap-1.5 ${attachments.length > 1 ? "max-w-[220px]" : ""}`}>
            {attachments.map((attachment) => {
                const isImage = attachment.content_type.startsWith("image/");

                if (isImage) {
                    return (
                        <a
                            key={attachment.id}
                            href={attachment.file}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`block overflow-hidden rounded-xl border ${
                                isMine ? "border-white/20" : "border-crease"
                            }`}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element -- remote, dynamically-sized upload */}
                            <img
                                src={attachment.file}
                                alt={attachment.file_name || "Attachment"}
                                className="h-28 w-28 object-cover"
                                loading="lazy"
                            />
                        </a>
                    );
                }

                return (
                    <a
                        key={attachment.id}
                        href={attachment.file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex max-w-[200px] items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
                            isMine
                                ? "border-white/20 bg-white/10 text-white hover:bg-white/15"
                                : "border-crease bg-paper text-ink hover:bg-steam"
                        }`}
                    >
                        <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">{attachment.file_name || "File"}</span>
                    </a>
                );
            })}
        </div>
    );
}
