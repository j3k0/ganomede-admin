import { useState } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";
import { ApiError } from "../../lib/api.js";
import { useUserProfile, useAwardCurrency, useBan, useUnban, usePasswordReset } from "../../lib/queries/users.js";
import { formatDate, formatDateRelative, passwordSuggestion, stripPrefix } from "../../lib/utils.js";
import { getConfig } from "../../lib/config.js";
import { Transactions } from "./Transactions.js";
import { ReportsBlocks } from "./ReportsBlocks.js";
import { MetadataEditor } from "./MetadataEditor.js";
import { EmailDialog } from "./EmailDialog.js";
import { Games } from "./Games.js";
import { Ranking } from "./Ranking.js";

export function UserProfile() {
  const { username } = useParams<{ username: string }>();
  const { data: profile, isLoading, error } = useUserProfile(username ?? "");
  const config = getConfig();
  const [showEmail, setShowEmail] = useState(false);

  if (isLoading) return <p className="text-gray-500">Loading profile...</p>;
  if (error) return <ErrorMessage error={error} />;
  if (!profile) return <p className="text-gray-500">No profile data</p>;

  // Extract header metadata from profile.metadata (fetched inline with profile)
  const meta = (profile.metadata ?? {}) as Record<string, string>;

  const warningLabels: Record<string, string> = {
    balance: "Balance", transactions: "Transactions", banInfo: "Ban status",
    avatar: "Avatar", metadata: "User metadata", directory: "Directory",
  };
  // "deleted" gets its own banner: it decides whether a reset means anything.
  const otherWarnings = (profile._warnings ?? []).filter((w) => w !== "deleted");

  return (
    <div className="space-y-3">
      {/* Warnings banner */}
      {profile.deleted === "unknown" && (
        <div className="rounded border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          <strong>Deletion status unknown.</strong>{" "}
          Could not check whether this account is deleted. If it is, it can&apos;t log in and a password reset has no effect.
        </div>
      )}
      {otherWarnings.length > 0 && (
        <div className="rounded border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          <strong>Some data may be incomplete.</strong>{" "}
          Could not load: {otherWarnings.map((w) => warningLabels[w] ?? w).join(", ")}.
        </div>
      )}
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
            <BanBadge banned={profile.banInfo.exists} since={profile.banInfo.createdAt} deleted={profile.deleted} />
            {profile.deleted === true && (
              <span className="rounded bg-gray-700 px-2 py-0.5 text-xs font-medium text-white">Deleted account</span>
            )}
            {profile.deleted === "unknown" && (
              <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Deletion status unknown</span>
            )}
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
        <PasswordResetButton userId={profile.userId} deleted={profile.deleted} banned={profile.banInfo.exists} />
        <AwardButton userId={profile.userId} currencies={config.currencies} />
        {profile.directory?.aliases?.email && (
          <button
            onClick={() => setShowEmail(true)}
            className="rounded bg-purple-600 px-3 py-1.5 text-sm text-white hover:bg-purple-700"
          >
            Send Email
          </button>
        )}
        <AnalyticsEventsLink userId={profile.userId} urlTemplate={config.analyticsGrafanaUrl} />
      </div>

      {/* Two-column layout */}
      <div className="flex gap-4">
        {/* Left column: balance, reports, metadata */}
        <div className="w-1/2 min-w-0 space-y-3">
          {/* Balance */}
          {Array.isArray(profile.balance) && profile.balance.length > 0 && (
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase text-gray-400">Balance</h3>
              <div className="flex items-center gap-3 rounded bg-gray-50 px-3 py-2">
                {profile.balance.map((b: { currency: string; count: number }, i: number) => {
                  const name = stripPrefix(b.currency);
                  const coinColor = name.includes("gold") ? "text-yellow-400"
                    : name.includes("silver") ? "text-gray-400"
                    : "text-blue-400";
                  return (
                    <span key={b.currency} className="flex items-center gap-1" title={name}>
                      {i > 0 && <span className="mr-2 text-gray-300">|</span>}
                      <span className={`text-xl leading-none ${coinColor}`}>{"\u25CF"}</span>
                      <span className="font-mono text-sm font-bold">{b.count}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Ranking */}
          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase text-gray-400">Ranking</h3>
            <Ranking userId={profile.userId} />
          </div>

          {/* Reports & Blocks */}
          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase text-gray-400">Reports & Blocks</h3>
            <ReportsBlocks userId={profile.userId} />
          </div>

          {/* Games */}
          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase text-gray-400">Games</h3>
            <Games userId={profile.userId} />
          </div>

          {/* Metadata */}
          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase text-gray-400">Metadata</h3>
            <MetadataEditor userId={profile.userId} />
          </div>
        </div>

        {/* Right column: transactions */}
        <div className="w-1/2 min-w-0">
          <h3 className="mb-1 text-xs font-semibold uppercase text-gray-400">
            Transactions ({profile.transactions.length}{profile._transactionsHasMore ? "+" : ""})
          </h3>
          <div className="max-h-[65vh] overflow-y-auto rounded border">
            <div className="px-3 py-2">
              <Transactions transactions={profile.transactions} username={profile.userId} hasMore={profile._transactionsHasMore} />
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

/**
 * Link to the user's recent analytics events in Grafana. Hidden unless
 * ANALYTICS_GRAFANA_URL is configured ("{userId}" placeholder in the template).
 * Exported for tests.
 */
export function AnalyticsEventsLink({ userId, urlTemplate }: { userId: string; urlTemplate: string }) {
  if (!urlTemplate) return null;
  const href = urlTemplate.replaceAll("{userId}", encodeURIComponent(userId));
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
    >
      Recent Events {"↗"}
    </a>
  );
}

export function BanBadge(
  { banned, since, deleted }: { banned: boolean; since?: string; deleted: boolean | "unknown" },
) {
  if (banned) {
    return (
      <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
        Banned {since ? formatDateRelative(since) : ""}
      </span>
    );
  }
  // Not banned says nothing good about a deleted (or possibly deleted) account.
  if (deleted !== false) return null;
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

export function PasswordResetButton(
  { userId, deleted, banned }: { userId: string; deleted: boolean | "unknown"; banned: boolean },
) {
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
        onSuccess: (data) => {
          // The server re-reads the flag before resetting: its answer is authoritative.
          if (data?.deleted === "unknown") {
            toast.warning(`Password set for ${userId}, but deletion status is unknown: it may have no effect.`);
          } else {
            toast.success(`Password reset for ${userId}`);
          }
          setOpen(false);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  if (deleted === true) {
    return (
      <button
        disabled
        title="This account is deleted. It can never log in again, so a new password would have no effect."
        className="cursor-not-allowed rounded bg-gray-300 px-3 py-1.5 text-sm text-gray-600"
      >
        Reset Password (account deleted)
      </button>
    );
  }

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="rounded bg-yellow-500 px-3 py-1.5 text-sm text-white hover:bg-yellow-600"
      >
        {deleted === "unknown" ? "Reset Password (deletion status unknown)" : "Reset Password"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded border border-yellow-200 bg-yellow-50 p-2">
      {deleted === "unknown" && (
        <span className="text-sm font-medium text-amber-700">Deletion status unknown: this may have no effect.</span>
      )}
      {banned && (
        <span className="text-sm font-medium text-red-700">Banned: the user can&apos;t log in until unbanned.</span>
      )}
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

const FRIENDLY_MESSAGES: Record<number, string> = {
  401: "Unauthorized — please log in again.",
  403: "Forbidden — you don't have permission for this action.",
  404: "User not found.",
  500: "Internal server error.",
  502: "Bad response from an upstream service.",
  503: "Service unavailable — try again in a moment.",
  504: "Request timed out — the upstream service is slow or down.",
};

function ErrorMessage({ error }: { error: Error }) {
  const [showDetails, setShowDetails] = useState(false);
  const status = error instanceof ApiError ? error.status : 0;
  const friendly = FRIENDLY_MESSAGES[status] ?? "Something went wrong. Please try again.";

  return (
    <div className="rounded border border-red-300 bg-red-50 px-4 py-3 text-sm">
      <p className="font-medium text-red-800">{friendly}</p>
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="mt-1 text-xs text-red-600 hover:underline"
      >
        {showDetails ? "Hide" : "Show"} technical details
      </button>
      {showDetails && (
        <pre className="mt-2 max-h-40 overflow-auto rounded bg-red-100 p-2 text-xs text-red-900">
          {error instanceof ApiError
            ? JSON.stringify(error.data, null, 2)
            : error.message}
        </pre>
      )}
    </div>
  );
}
