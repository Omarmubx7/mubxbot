"use client";

import { useState } from 'react';

export default function TestChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = { type: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input })
      });

      const data = await res.json();
      setMessages(prev => [...prev, { type: 'bot', content: data.response }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        type: 'bot', 
        content: 'Error: ' + error.message 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-gray-50 p-3 sm:p-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-4 sm:p-6">
        <h1 className="text-xl sm:text-2xl font-bold mb-4">MubxBot API Test</h1>
        
        <div className="space-y-4 mb-4 max-h-[55dvh] sm:max-h-96 overflow-y-auto">
          {messages.map((msg, i) => (
            <div key={i} className={`p-3 rounded ${
              msg.type === 'user' 
                ? 'bg-blue-100 ml-auto max-w-[92%] sm:max-w-[80%]' 
                : 'bg-gray-100 mr-auto max-w-[92%] sm:max-w-[80%]'
            }`}>
              <div className="font-bold text-sm">
                {msg.type === 'user' ? 'You' : 'MubxBot'}
              </div>
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          ))}
          {loading && <div className="text-gray-400">Thinking...</div>}
        </div>

        <form onSubmit={sendMessage} className="flex flex-col sm:flex-row gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about office hours..."
            className="flex-1 border rounded-xl px-4 py-3 min-h-11"
          />
          <button 
            type="submit"
            disabled={loading}
            className="bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 disabled:opacity-50 min-h-11"
          >
            Send
          </button>
        </form>

        <div className="mt-4 text-sm text-gray-600">
          <p><strong>Try asking:</strong></p>
          <ul className="list-disc ml-5 mt-2 space-y-1">
            <li>"What are Dr. Weam's office hours?"</li>
            <li>"Show me CS department office hours"</li>
            <li>"When is Eng Ashraf available?"</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
