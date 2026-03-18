import { useState } from "react";
import { toast } from "sonner";
import { useSendEmail } from "../../lib/queries/users.js";

interface EmailDialogProps {
  email: string;
  username: string;
  onClose: () => void;
}

export function EmailDialog({ email, username, onClose }: EmailDialogProps) {
  const send = useSendEmail();
  const [subject, setSubject] = useState(`Message for ${username}`);
  const [text, setText] = useState("");

  function handleSend() {
    if (!subject.trim() || !text.trim()) {
      toast.error("Subject and body are required");
      return;
    }
    send.mutate(
      {
        to: email,
        subject: subject.replace("{username}", username),
        text: text.replace("{username}", username),
      },
      {
        onSuccess: () => {
          toast.success("Email sent");
          onClose();
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded bg-white p-6 shadow-lg">
        <h3 className="mb-4 text-lg font-semibold">Send Email to {username}</h3>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">To</label>
            <input type="text" value={email} disabled className="mt-1 w-full rounded border bg-gray-50 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Body</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              placeholder="Use {username} for substitution"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={send.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {send.isPending ? "Sending..." : "Send Email"}
          </button>
        </div>
      </div>
    </div>
  );
}
