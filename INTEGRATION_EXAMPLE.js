// Add this function to your app/page.js to call the API

async function getAIResponse(userMessage) {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMessage })
    });
    
    const data = await response.json();
    return data.response || "Sorry, I couldn't process that.";
  } catch (error) {
    console.error('API Error:', error);
    return "Sorry, I'm having trouble connecting right now.";
  }
}

// Then in your handleBotResponse function, add:
// const aiResponse = await getAIResponse(userText);
// setMessages(prev => [...prev, {
//   id: Date.now(),
//   type: 'bot',
//   content: aiResponse,
//   timestamp: getCurrentTime()
// }]);
