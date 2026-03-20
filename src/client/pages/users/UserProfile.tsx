import { useState } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";
import { useUserProfile, useAwardCurrency, useBan, useUnban, usePasswordReset } from "../../lib/queries/users.js";
import { formatDate, formatDateRelative, passwordSuggestion, stripPrefix } from "../../lib/utils.js";
import { getConfig } from "../../lib/config.js";
import { Transactions } from "./Transactions.js";
import { ReportsBlocks } from "./ReportsBlocks.js";
import { MetadataEditor } from "./MetadataEditor.js";
import { EmailDialog } from "./EmailDialog.js";

export function UserProfile() {
  const { username } = useParams<{ username: string }>();
  const { data: profile, isLoading, error } = useUserProfile(username ?? "");
  const config = getConfig();
  const [showEmail, setShowEmail] = useState(false);

  if (isLoading) return <p className="text-gray-500">Loading profile...</p>;
  if (error) return <p className="text-red-600">Error loading profile: {error.message}</p>;
  if (!profile) return <p className="text-gray-500">No profile data</p>;

  // Extract header metadata from profile.metadata (fetched inline with profile)
  const meta = (profile.metadata ?? {}) as Record<string, string>;

  return (
    <div className="space-y-3">
      {/* Header: avatar + info + ban badge */}
      <div className="flex items-start gap-4">
        {profile.avatar ? (
          <img src={profile.avatar} alt="avatar" className="h-14 w-14 rounded" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded bg-gray-200 text-[10px] text-gray-400">
            No avatar
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold">{profile.userId}</h2>
            <BanBadge banned={profile.banInfo.exists} since={profile.banInfo.createdAt} />
          </div>
          {profile.directory?.aliases && (
            <p className="text-sm text-gray-500">
              {profile.directory.aliases.name && (
                <span className="font-medium">{profile.directory.aliases.name}</span>
              )}
              {profile.directory.aliases.email && (
                <> &middot; <a href={`mailto:${profile.directory.aliases.email}`} className="text-blue-600 hover:underline">{profile.directory.aliases.email}</a></>
              )}
            </p>
          )}
          <p className="text-xs text-gray-400">
            {meta.auth && <>Seen {formatDateRelative(meta.auth)} ({formatDate(parseInt(meta.auth, 10))})</>}
            {meta.locale ? ` · ${meta.locale}` : ""}
            {meta.country ? ` · ${meta.country}` : ""}
            {meta.location ? ` · ${meta.location}` : ""}
          </p>
        </div>
      </div>

      {/* Actions row — compact */}
      <div className="flex flex-wrap items-center gap-2">
        <BanButton userId={profile.userId} banned={profile.banInfo.exists} />
        <PasswordResetButton userId={profile.userId} />
        <AwardButton userId={profile.userId} currencies={config.currencies} />
        {profile.directory?.aliases?.email && (
          <button
            onClick={() => setShowEmail(true)}
            className="rounded bg-purple-600 px-3 py-1.5 text-sm text-white hover:bg-purple-700"
          >
            Send Email
          </button>
        )}
      </div>

      {/* Two-column layout */}
      <div className="flex gap-4">
        {/* Left column: balance, reports, metadata */}
        <div className="w-72 shrink-0 space-y-3">
          {/* Balance */}
          {Array.isArray(profile.balance) && profile.balance.length > 0 && (
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase text-gray-400">Balance</h3>
              <div className="space-y-0.5">
                {profile.balance.map((b: { currency: string; count: number }) => (
                  <div key={b.currency} className="flex items-center justify-between rounded bg-gray-50 px-2 py-1">
                    <span className="text-xs text-gray-500">{stripPrefix(b.currency)}</span>
                    <span className="font-mono text-sm font-bold">{b.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reports & Blocks */}
          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase text-gray-400">Reports & Blocks</h3>
            <ReportsBlocks userId={profile.userId} />
          </div>

          {/* Metadata */}
          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase text-gray-400">Metadata</h3>
            <MetadataEditor userId={profile.userId} />
          </div>
        </div>

        {/* Right column: transactions — narrower, scrollable */}
        <div className="min-w-0 flex-1">
          <h3 className="mb-1 text-xs font-semibold uppercase text-gray-400">
            Transactions ({profile.transactions.length})
          </h3>
          <div className="max-h-[65vh] overflow-y-auto rounded border">
            <div className="px-3 py-2">
              <Transactions transactions={profile.transactions} />
            </div>
          </div>
        </div>
      </div>

      {showEmail && profile.directory?.aliases?.email && (
        <EmailDialog
          email={profile.directory.aliases.email}
          username={profile.userId}
          onClose={() => setShowEmail(false)}
        />
      )}
    </div>
  );
}

// --- Sub-components ---

function BanBadge({ banned, since }: { banned: boolean; since?: string }) {
  if (banned) {
    return (
      <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
        Banned {since ? formatDateRelative(since) : ""}
      </span>
    );
  }
  return (
    <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
      In Good Standing
    </span>
  );
}

function BanButton({ userId, banned }: { userId: string; banned: boolean }) {
  const ban = useBan(userId);
  const unban = useUnban(userId);
  const [confirming, setConfirming] = useState(false);

  function handleAction() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    const mutation = banned ? unban : ban;
    mutation.mutate(undefined, {
      onSuccess: () => {
        toast.success(banned ? "User unbanned" : "User banned");
        setConfirming(false);
      },
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <div className="flex gap-1">
      <button
        onClick={handleAction}
        className={`rounded px-3 py-1.5 text-sm text-white ${
          banned ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
        }`}
      >
        {confirming ? `Confirm ${banned ? "Unban" : "Ban"}?` : banned ? "Unban" : "Ban"}
      </button>
      {confirming && (
        <button onClick={() => setConfirming(false)} className="text-sm text-gray-500 hover:underline">
          Cancel
        </button>
      )}
    </div>
  );
}

function PasswordResetButton({ userId }: { userId: string }) {
  const reset = usePasswordReset(userId);
  const [open, setOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  function handleOpen() {
    setNewPassword(passwordSuggestion());
    setOpen(true);
  }

  function handleReset() {
    reset.mutate(
      { newPassword },
      {
        onSuccess: () => {
          toast.success(`Password reset for ${userId}`);
          setOpen(false);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  if (!open) {
    return (
      <button onClick={handleOpen} className="rounded bg-yellow-500 px-3 py-1.5 text-sm text-white hover:bg-yellow-600">
        Reset Password
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded border border-yellow-200 bg-yellow-50 p-2">
      <input
        type="text"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        className="rounded border px-2 py-1 text-sm"
      />
      <button onClick={handleReset} disabled={reset.isPending} className="rounded bg-yellow-500 px-3 py-1 text-sm text-white">
        {reset.isPending ? "Resetting..." : "Set Password"}
      </button>
      <button onClick={() => setOpen(false)} className="text-sm text-gray-500 hover:underline">
        Cancel
      </button>
    </div>
  );
}

function AwardButton({ userId, currencies }: { userId: string; currencies: string[] }) {
  const award = useAwardCurrency(userId);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(currencies[0] ?? "");

  function handleAward() {
    const num = parseInt(amount, 10);
    if (!num || num <= 0) return;
    award.mutate(
      { amount: num, currency },
      {
        onSuccess: () => {
          toast.success(`Awarded ${num} ${stripPrefix(currency)} to ${userId}`);
          setOpen(false);
          setAmount("");
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">
        Award Currency
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded border border-blue-200 bg-blue-50 p-2">
      <input
        type="number"
        min="1"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount"
        className="w-24 rounded border px-2 py-1 text-sm"
      />
      <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="rounded border px-2 py-1 text-sm">
        {currencies.map((c) => (
          <option key={c} value={c}>
            {stripPrefix(c)}
          </option>
        ))}
      </select>
      <button onClick={handleAward} disabled={award.isPending} className="rounded bg-blue-600 px-3 py-1 text-sm text-white">
        {award.isPending ? "Awarding..." : "Award"}
      </button>
      <button onClick={() => setOpen(false)} className="text-sm text-gray-500 hover:underline">
        Cancel
      </button>
    </div>
  );
}
