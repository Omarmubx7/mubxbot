
import React, { useEffect, useRef, useState } from "react";
import MessageBubble from "./MessageBubble.jsx";
import Fuse from "fuse.js";

function formatDoctorInfo(doctor) {
  return (
    <div>
      <div className="font-bold">{doctor.name}</div>
      <div>School: {doctor.school}</div>
      <div>Department: {doctor.department}</div>
      <div>Office: {doctor.office}</div>
      <div>
        Email: {" "}
        <a
          href={`mailto:${doctor.email}`}
          aria-label={`Send email to ${doctor.name}`}
          className="text-blue-600 dark:text-blue-400 underline"
        >
          {doctor.email}
        </a>
      </div>
      <div>
        Office hours:
        <ul className="ml-2">
          {Object.entries(doctor.office_hours).map(([day, hours]) => (
            <li key={day}>
              <span className="font-semibold">{day}:</span> {hours}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function ChatWindow() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [fuse, setFuse] = useState(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    fetch("/doctors.json")
      .then((res) => res.json())
      .then((data) => {
        setFuse(
          new Fuse(data, {
            includeScore: true,
            threshold: 0.3,
            keys: ["name", "department", "school", "email", "office"],
          })
        );
        setMessages([
          {
            sender: "system",
            content: (
              <span>
                Hi! Type a doctor’s name and I’ll show their info.
              </span>
            ),
          },
        ]);
      })
      .catch(() => {
        setMessages([
          {
            sender: "system",
            content: (
              <span>
                Failed to load doctors data. Please check that doctors.json is in the public folder.
              </span>
            ),
          },
        ]);
      });
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend() {
    if (!input.trim()) return;
    setMessages((msgs) => [
      ...msgs,
      { sender: "user", content: <span>{input}</span> },
    ]);
    if (fuse) {
      const results = fuse.search(input.trim());
      if (results.length > 0) {
        setMessages((msgs) => [
          ...msgs,
          { sender: "system", content: formatDoctorInfo(results[0].item) },
        ]);
      } else {
        setMessages((msgs) => [
          ...msgs,
          {
            sender: "system",
            content: (
              <span>
                No doctors found for ‘{input.trim()}’.
              </span>
            ),
          },
        ]);
      }
    }
    setInput("");
  }

  function handleInputKey(e) {
    if (e.key === "Enter") handleSend();
  }

  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1 overflow-y-auto px-2 py-3" aria-live="polite">
        {messages.map((msg, idx) => (
          <MessageBubble key={idx} sender={msg.sender}>
            {msg.content}
          </MessageBubble>
        ))}
        <div ref={chatEndRef} />
      </div>
      <div className="flex items-center gap-2 px-3 py-2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <input
          type="text"
          className="flex-1 px-4 py-2 rounded-full border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none"
          placeholder="Search for a doctor by name"
          aria-label="Search for a doctor by name"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleInputKey}
        />
        <button
          className="px-4 py-2 rounded-full bg-blue-500 text-white font-semibold transition hover:bg-blue-600"
          onClick={handleSend}
          aria-label="Send message"
        >
          Send
        </button>
      </div>
    </div>
  );
}
