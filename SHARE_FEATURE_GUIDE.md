# MUBXBot Share & Screenshot Guide

## Overview
The Share button has been added to make your MUBXBot conversations more shareable! You can now easily share your conversations, capture screenshots, and save your interactions.

## Features

### 1. **Share Text** 
- **What it does**: Shares your entire conversation history with formatted text
- **How to use**:
  - Click the Share button (📤) in the header
  - Select "Share Text"
  - Choose your device's native share method or copy to clipboard
- **Best for**: Sharing conversations via messaging apps, email, or social media

### 2. **Copy to Clipboard**
- **What it does**: Copies the entire conversation as plain text to your clipboard
- **How to use**:
  - Click the Share button
  - Select "Copy Text"
  - Paste anywhere with Ctrl+V (or Cmd+V on Mac)
- **Best for**: Pasting into documents, notes, or other apps

### 3. **Screenshot**
- **What it does**: Captures a visual screenshot of the current conversation
- **How to use**:
  - Click the Share button
  - Select "Screenshot"
  - The image will be shared or downloaded automatically
- **Keyboard Shortcut**: `Ctrl+Shift+S` (Windows/Linux) or `Cmd+Shift+S` (Mac)
- **Best for**: Sharing visual proof of results, social media posts

## Keyboard Shortcuts

Make sharing faster with these keyboard shortcuts:

| Action | Windows/Linux | Mac |
|--------|--------------|-----|
| Toggle Share Menu | `Ctrl+Shift+H` | `Cmd+Shift+H` |
| Capture Screenshot | `Ctrl+Shift+S` | `Cmd+Shift+S` |

## Tips for Best Results

### For Screenshots:
1. Make sure your conversation is visible on screen
2. The screenshot will capture the chat content area
3. Screenshots save automatically to your Downloads folder if sharing isn't available

### For Text Sharing:
1. Conversations include timestamps and sender names
2. The format is: `You: [question]` and `MUBXBot: [response]`
3. Perfect for creating documentation or sharing with classmates

### CTA Placement:
- **Header Share Button**: Always visible for quick access
- **Bottom Share Button**: Appears when you have messages, making it a strong CTA
- **Keyboard Shortcuts**: For power users who want the fastest experience

## Benefits

✅ **Easy Sharing**: No need to manually select and copy text  
✅ **Visual Proof**: Screenshots show exact results  
✅ **Cross-Platform**: Share via any method your device supports  
✅ **Quick Access**: Buttons and keyboard shortcuts for convenience  
✅ **Professional**: Share conversations with professors or colleagues  

## Troubleshooting

### Screenshots not working?
- Make sure you're not in private/incognito mode
- Try using the browser's built-in screenshot tool as fallback
- Ensure html2canvas is properly installed (npm install html2canvas)

### Share button grayed out?
- You need at least one message in the conversation
- Send a message first, then the share button will activate

### Keyboard shortcuts not responding?
- Make sure the chat window is in focus
- Some browsers may override these shortcuts
- Use the manual button click as a fallback

## Installation

The share feature is built-in! Just make sure dependencies are installed:

```bash
npm install html2canvas
```

Then run your app as usual:

```bash
npm run dev
```

## Future Enhancements

Coming soon:
- 📊 Export to PDF format
- 📋 Share via QR code
- 🎨 Custom themed screenshots
- 📧 Email conversation directly
