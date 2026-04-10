import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useChatRoom } from "../lib/queries/users.js";
import { formatDate } from "../lib/utils.js";

export function Chat() {
  const { username1, username2 } = useParams<{ username1: string; username2: string }>();
  const navigate = useNavigate();
  const [input1, setInput1] = useState(username1 ?? "");
  const [input2, setInput2] = useState(username2 ?? "");
  const { data, isLoading, error } = useChatRoom(username1 ?? "", username2 ?? "");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (input1.trim() && input2.trim()) {
      navigate(`/admin/v1/web/chat/${input1.trim()},${input2.trim()}`);
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Chat History</h1>

      <form onSubmit={handleSearch} className="mb-6 flex gap-2">
        <input
          type="text"
          value={input1}
          onChange={(e) => setInput1(e.target.value)}
          placeholder="Username 1"
          className="flex-1 rounded border border-gray-300 px-3 py-2"
        />
        <input
          type="text"
          value={input2}
          onChange={(e) => setInput2(e.target.value)}
          placeholder="Username 2"
          className="flex-1 rounded border border-gray-300 px-3 py-2"
        />
        <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          Get Chat
        </button>
      </form>

      {isLoading && <p className="text-gray-500">Loading chat...</p>}
      {error && <p className="text-red-600">{error.message}</p>}

      {data && (
        <div>
          <p className="mb-3 text-sm text-gray-500">{data.messages.length} messages</p>
          <div className="space-y-2">
            {data.messages.map((msg, i) => {
              const isSystem = msg.from === "$$";
              return (
                <div
                  key={i}
                  className={`rounded p-2 text-sm ${
                    isSystem
                      ? "bg-gray-100 text-center text-gray-500 italic"
                      : msg.from === data.users[0]
                        ? "bg-blue-50"
                        : "bg-green-50"
                  }`}
                >
                  {!isSystem && <span className="mr-2 font-semibold">{msg.from}</span>}
                  <span>{msg.message}</span>
                  <span className="ml-2 text-xs text-gray-400">{formatDate(msg.timestamp)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
