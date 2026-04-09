
EvoFlow V8 chat UI upgrade safe patch

What this changes:
- Better rich rendering inside chat messages
- Detects markdown-style code blocks
- Adds Copy code button on code blocks
- Adds simple markdown-ish rendering for headings and lists
- Adds a blinking cursor while streaming on the current assistant message

Only file included:
- apps/web/app/chat/ChatClient.tsx

Copy to:
- C:\EvoFlow\apps\web\app\chat\ChatClient.tsx

Do exactly this:
1. Stop the web app with Ctrl + C
2. Replace the file
3. Start the web app again:
   cd C:\EvoFlow\apps\web
   npm run dev
4. Open:
   http://localhost:3000/chat

What should happen:
- Chat still works
- Code answers look much better
- Code blocks show a Copy code button
- Streaming shows a blinking cursor
