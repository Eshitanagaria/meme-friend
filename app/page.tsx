"use client";
import { useState, useEffect, useRef } from "react";

export default function Home() {
  const [messages, setMessages] = useState<
    { sender: string; text: string; gifUrl?: string }[]
  >([{ sender: "bot", text: "👋 Hey! I’m your Meme Friend. Talk to me in memes!" }]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMessage = { sender: "you", text: input };
    setMessages((prev) => [...prev, newMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: data.caption, gifUrl: data.gifUrl },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "⚠️ Oops, something went wrong!" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      <h1 className="text-3xl font-bold mb-4">🤖 Meme Friend</h1>

      <div className="w-full max-w-2xl bg-gray-800 rounded-2xl shadow-lg p-4 flex flex-col h-[600px]">
        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`p-2 rounded-lg max-w-[80%] ${
                msg.sender === "you"
                  ? "bg-blue-500 self-end text-white ml-auto"
                  : "bg-gray-700 text-gray-200"
              }`}
            >
              {msg.gifUrl && (
                <img
                  src={msg.gifUrl}
                  alt="meme gif"
                  className="mb-2 rounded-lg max-w-full"
                  onLoad={scrollToBottom} // scroll AFTER gif loads
                />
              )}
              {msg.text}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Say something..."
            className="flex-1 p-2 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none"
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg disabled:opacity-50"
          >
            {loading ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
