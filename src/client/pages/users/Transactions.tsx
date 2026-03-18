import { useState } from "react";
import { groupBy, stripPrefix, formatDate } from "../../lib/utils.js";
import type { Transaction } from "../../lib/queries/users.js";

interface TransactionsProps {
  transactions: Transaction[];
}

function getItemName(tx: Transaction): string {
  const data = tx.data ?? {};
  const raw = (data.packId ?? data.itemId ?? data.rewardId ?? "") as string;
  return stripPrefix(raw);
}

function getReason(tx: Transaction): string {
  if (tx.data?.from === "admin") return "award";
  return tx.reason ?? "unknown";
}

export function Transactions({ transactions }: TransactionsProps) {
  const [expandedTx, setExpandedTx] = useState<string | null>(null);

  if (transactions.length === 0) {
    return <p className="text-sm text-gray-500">No transactions</p>;
  }

  const grouped = groupBy(transactions, (tx) => tx.currency);

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([currency, txs]) => {
        // Sort ascending by timestamp, compute running balance
        const sorted = [...txs].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        );
        let runningBalance = 0;
        const withBalance = sorted.map((tx) => {
          runningBalance += tx.amount;
          return { ...tx, runningBalance };
        });
        // Display latest first
        withBalance.reverse();

        return (
          <div key={currency}>
            <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500">
              {stripPrefix(currency)}
            </h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-1">Date</th>
                  <th className="pb-1">Item</th>
                  <th className="pb-1">Reason</th>
                  <th className="pb-1 text-right">Amount</th>
                  <th className="pb-1 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {withBalance.map((tx) => (
                  <tr
                    key={tx.id}
                    className="cursor-pointer border-b hover:bg-gray-50"
                    onClick={() => setExpandedTx(expandedTx === tx.id ? null : tx.id)}
                  >
                    <td className="py-1">{formatDate(tx.timestamp)}</td>
                    <td className="py-1">{getItemName(tx)}</td>
                    <td className="py-1">{getReason(tx)}</td>
                    <td className={`py-1 text-right ${tx.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {tx.amount >= 0 ? "+" : ""}
                      {tx.amount}
                    </td>
                    <td className="py-1 text-right">{tx.runningBalance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      {expandedTx && (
        <div className="mt-2 rounded bg-gray-100 p-3">
          <h5 className="mb-1 text-xs font-semibold uppercase text-gray-500">Transaction Detail</h5>
          <pre className="overflow-auto text-xs">
            {JSON.stringify(
              transactions.find((tx) => tx.id === expandedTx),
              null,
              2,
            )}
          </pre>
          <button
            onClick={() => setExpandedTx(null)}
            className="mt-2 text-xs text-blue-600 hover:underline"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
