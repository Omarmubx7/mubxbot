# 🤖 AI-Powered Smart Responses Setup

MubxBot now supports **AI-powered intelligent responses** using OpenAI's GPT models!

## Features

✅ **Natural language understanding** - Ask questions in any way you like  
✅ **Context-aware responses** - Understands what you're asking about  
✅ **Specific information extraction** - "When is he available on Monday?" gets parsed intelligently  
✅ **Conversational tone** - Friendly, helpful responses like talking to a real person  
✅ **Automatic fallback** - Works without AI too, using structured data

## Setup Instructions

### 1. Get an OpenAI API Key

1. Visit [platform.openai.com](https://platform.openai.com)
2. Sign up or log in
3. Go to **API Keys** section
4. Click **Create new secret key**
5. Copy the key (starts with `sk-...`)

### 2. Add API Key to .env

Open `.env` file and replace:
```env
OPENAI_API_KEY=your_openai_api_key_here
```

With your actual key:
```env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx
```

### 3. (Optional) Change AI Model

By default, the bot uses `gpt-4o-mini` (faster and cheaper). To use a different model, add to `.env`:

```env
OPENAI_MODEL=gpt-4o-mini  # Fast and economical (recommended)
# or
OPENAI_MODEL=gpt-4o       # More powerful but slower and costlier
```

### 4. Restart the Server

```bash
npm run dev
```

## How It Works

### Without AI (Structured Responses)
- Bot returns professor cards with formatted data
- Shows clickable lists for multiple results
- Works perfectly, but responses are template-based

### With AI (Smart Responses)
- Bot understands natural language questions
- Extracts specific info: "When on Monday?" → Shows Monday schedule
- Gives conversational answers
- Still can show cards if you prefer

## Example Queries That Work Better With AI

🔹 **"When is Dr. Murad available on Wednesday?"**  
   → AI extracts Wednesday info from schedule

🔹 **"Can I meet with Balqees in the morning?"**  
   → AI checks morning hours specifically

🔹 **"What's the best time to see Dr. Ahmad this week?"**  
   → AI analyzes the schedule and suggests times

🔹 **"Is Dr. Yaghi available after 3pm?"**  
   → AI filters schedule for afternoon hours

## Cost Considerations

- **gpt-4o-mini**: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- Average query: ~500 tokens (input + output)
- **~1000 queries = $0.50** (very affordable!)

For a university chatbot with moderate usage, costs are typically **under $5/month**.

## Testing

Try these queries to see the difference:

**Basic query:**
```
When is Dr. Murad Yaghi available?
```

**AI-enhanced query:**
```
When can I meet Dr. Murad Yaghi on Tuesday afternoon?
```

**Complex query:**
```
I need to see Dr. Murad between 2-4pm, when is he available?
```

## Troubleshooting

### "Works but no AI responses"
- Check `.env` has correct API key (starts with `sk-`)
- Verify key isn't `your_openai_api_key_here` (placeholder)
- Check OpenAI account has credits

### "API errors in console"
- Check API key is valid
- Verify you have OpenAI credits
- Try using `gpt-4o-mini` instead of `gpt-4o`

### "Still showing cards instead of text"
- This is normal! AI adds intelligence to text responses
- Cards are shown for multiple results or when AI is disabled
- Both work together for best experience

## Disable AI

To turn off AI and use only structured responses, set in `.env`:
```env
OPENAI_API_KEY=
```

Or remove the line entirely. Bot will work perfectly with structured data!

---

**Need help?** Check the console for detailed error messages or API responses.
