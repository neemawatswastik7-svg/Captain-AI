/* ============================================================
   CAPTAIN AI — JARVIS INTERFACE  |  script.js
   Powered by OpenRouter API
   ============================================================ */


/* ──────────────────────────────────────────────────────────
   🔑  STEP 1 — PASTE YOUR OPENROUTER API KEY HERE
       Get one free at: https://openrouter.ai/keys
   ────────────────────────────────────────────────────────── */
const API_KEY = "YOUR_API_KEY"


/* ──────────────────────────────────────────────────────────
   🤖  STEP 2 — MODEL SELECTION (free models listed below)
       Current: mistralai/mistral-7b-instruct  ← free & fast

   Other free options you can swap in:
     "google/gemma-3-4b-it:free"
     "meta-llama/llama-3.2-3b-instruct:free"
     "qwen/qwen3-8b:free"

   Browse all free models: https://openrouter.ai/models?q=free
   ────────────────────────────────────────────────────────── */
const MODEL = "deepseek/deepseek-chat";


/* ──────────────────────────────────────────────────────────
   🧠  STEP 3 — SYSTEM PROMPT (optional — tweak personality)
   ────────────────────────────────────────────────────────── */
const SYSTEM_PROMPT = `You are Captain AI, a Jarvis-style intelligent assistant with a sleek,
futuristic personality. You are precise, helpful, and occasionally use subtle sci-fi flair.
Address the user as "Commander" when it feels natural. Format responses clearly using
markdown-style bold (**text**) and line breaks where appropriate.`;


/* ============================================================
   ─── DOM References ───
   ============================================================ */
const chatArea          = document.getElementById('chatArea');
const messagesContainer = document.getElementById('messagesContainer');
const welcomeScreen     = document.getElementById('welcomeScreen');
const userInput         = document.getElementById('userInput');
const sendBtn           = document.getElementById('sendBtn');
const newChatBtn        = document.getElementById('newChatBtn');
const sidebar           = document.getElementById('sidebar');
const sidebarOverlay    = document.getElementById('sidebarOverlay');
const mobileMenu        = document.getElementById('mobileMenu');
const chatHistory       = document.getElementById('chatHistory');


/* ============================================================
   ─── State ───
   ============================================================ */
let isTyping     = false;
let sessionCount = 1;
let messageCount = 0;

/*
 * conversationHistory stores the full chat as an array of
 * { role, content } objects sent to the API on every request,
 * giving the AI memory across the whole session.
 */
let conversationHistory = [];


/* ============================================================
   ─── OpenRouter API Call ───
   ============================================================ */
async function fetchAIReply(userText) {

  /* Add the new user turn to the running history */
  conversationHistory.push({ role: "user", content: userText });

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type":  "application/json",
      /* Recommended by OpenRouter */
      "HTTP-Referer":  window.location.href,
      "X-Title":       "Captain AI"
    },
    body: JSON.stringify({
      model:    MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...conversationHistory
      ]
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${response.status}`);
  }

  const data   = await response.json();
  const aiText = data.choices?.[0]?.message?.content?.trim() || "No response received.";

  /* Save assistant reply so next turn has full context */
  conversationHistory.push({ role: "assistant", content: aiText });

  return aiText;
}


/* ============================================================
   ─── Utilities ───
   ============================================================ */
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function escapeHtml(str) {
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;');
}

function formatMessage(text) {
  /* Code blocks  ```lang\n...\n``` */
  text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, _lang, code) =>
    `<pre><code>${escapeHtml(code.trim())}</code></pre>`
  );
  /* Inline code  `...` */
  text = text.replace(/`([^`]+)`/g,
    '<code style="background:rgba(0,200,255,0.1);padding:2px 6px;border-radius:4px;font-family:monospace;font-size:12.5px;">$1</code>'
  );
  /* Bold  **...** */
  text = text.replace(/\*\*(.+?)\*\*/g,
    '<strong style="color:#7ee8fa;font-weight:600;">$1</strong>'
  );
  /* Line breaks */
  text = text.replace(/\n/g, '<br>');
  return text;
}


/* ============================================================
   ─── Scrolling ───
   ============================================================ */
function scrollToBottom(smooth = true) {
  chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: smooth ? 'smooth' : 'instant' });
}


/* ============================================================
   ─── Message Rendering ───
   ============================================================ */
function hideWelcome() {
  if (welcomeScreen && welcomeScreen.style.display !== 'none') {
    welcomeScreen.style.opacity    = '0';
    welcomeScreen.style.transform  = 'translateY(-10px)';
    welcomeScreen.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    setTimeout(() => { welcomeScreen.style.display = 'none'; }, 300);
  }
}

function appendMessage(role, html) {
  const row = document.createElement('div');
  row.classList.add('message-row', role);

  const avatarDiv = document.createElement('div');
  avatarDiv.classList.add('avatar', role);
  avatarDiv.textContent = role === 'ai' ? 'AI' : 'YOU';

  const bubble = document.createElement('div');
  bubble.classList.add('bubble', role);
  bubble.innerHTML = html;

  row.append(avatarDiv, bubble);
  messagesContainer.appendChild(row);
  scrollToBottom();
  return bubble;
}

function appendTypingIndicator() {
  const row = document.createElement('div');
  row.classList.add('message-row', 'ai');
  row.id = 'typingRow';

  const avatarDiv = document.createElement('div');
  avatarDiv.classList.add('avatar', 'ai');
  avatarDiv.textContent = 'AI';

  const bubble = document.createElement('div');
  bubble.classList.add('bubble', 'ai');
  bubble.innerHTML = `<div class="typing-indicator"><span></span><span></span><span></span></div>`;

  row.append(avatarDiv, bubble);
  messagesContainer.appendChild(row);
  scrollToBottom();
  return row;
}

function appendErrorBubble(message) {
  appendMessage('ai',
    `<span style="color:#ff6b6b;">⚠&nbsp;${escapeHtml(message)}</span>`
  );
}


/* ============================================================
   ─── Typewriter Effect ───
   ============================================================ */
async function typewriterEffect(bubble, text, delay = 14) {
  const words  = text.split(' ');
  const cursor = '<span style="display:inline-block;width:2px;height:14px;background:var(--accent);margin-left:2px;animation:typingDot 0.8s ease-in-out infinite;vertical-align:middle;"></span>';
  let built    = '';

  for (let i = 0; i < words.length; i++) {
    built += (i > 0 ? ' ' : '') + words[i];
    bubble.innerHTML = formatMessage(built) + cursor;
    scrollToBottom(false);
    await sleep(delay + Math.random() * 10);
  }

  /* Final render — cursor removed */
  bubble.innerHTML = formatMessage(text);
  scrollToBottom();
}


/* ============================================================
   ─── Send Message  (main flow) ───
   ============================================================ */
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text || isTyping) return;

  /* Warn if the placeholder key is still in place */
  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY.length < 20) {
    hideWelcome();
    appendMessage('user', escapeHtml(text));
    appendErrorBubble(
      "No API key set. Open script.js and replace the placeholder in OPENROUTER_API_KEY with your real key from openrouter.ai/keys"
    );
    userInput.value = '';
    autoResize();
    return;
  }

  isTyping = true;
  sendBtn.disabled = true;
  messageCount++;

  hideWelcome();
  appendMessage('user', escapeHtml(text));
  userInput.value = '';
  autoResize();

  const typingRow = appendTypingIndicator();

  try {
    const aiText = await fetchAIReply(text);
    typingRow.remove();
    const aiBubble = appendMessage('ai', '');
    await typewriterEffect(aiBubble, aiText);

  } catch (error) {
    typingRow.remove();
    appendErrorBubble(`API error: ${error.message}`);
    /*
     * Remove the user turn we added in fetchAIReply so the next
     * message doesn't carry a dangling unanswered entry.
     */
    conversationHistory.pop();
  }

  isTyping = false;
  sendBtn.disabled = false;
  userInput.focus();
}


/* ============================================================
   ─── Textarea Auto-resize ───
   ============================================================ */
function autoResize() {
  userInput.style.height = 'auto';
  userInput.style.height = Math.min(userInput.scrollHeight, 140) + 'px';
}


/* ============================================================
   ─── Event Listeners ───
   ============================================================ */
sendBtn.addEventListener('click', sendMessage);

userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

userInput.addEventListener('input', autoResize);

/* Suggestion cards */
document.querySelectorAll('.suggestion-card').forEach(card => {
  card.addEventListener('click', () => {
    const prompt = card.dataset.prompt;
    if (prompt) {
      userInput.value = prompt;
      autoResize();
      sendMessage();
    }
  });
});

/* New Chat — resets UI and wipes conversation history */
newChatBtn.addEventListener('click', () => {
  sessionCount++;
  messageCount        = 0;
  isTyping            = false;
  sendBtn.disabled    = false;
  conversationHistory = [];   /* ← fresh memory for new session */

  messagesContainer.innerHTML = '';

  if (welcomeScreen) {
    welcomeScreen.style.display   = '';
    welcomeScreen.style.opacity   = '1';
    welcomeScreen.style.transform = 'translateY(0)';
  }

  const newItem = document.createElement('li');
  newItem.classList.add('history-item');
  newItem.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
    <span>Session ${sessionCount}</span>
  `;
  newItem.addEventListener('click', () => {
    document.querySelectorAll('.history-item').forEach(i => i.classList.remove('active'));
    newItem.classList.add('active');
  });

  document.querySelectorAll('.history-item').forEach(i => i.classList.remove('active'));
  newItem.classList.add('active');
  chatHistory.prepend(newItem);

  userInput.value = '';
  autoResize();
  userInput.focus();
  closeMobileSidebar();
});

/* History item clicks */
chatHistory.addEventListener('click', (e) => {
  const item = e.target.closest('.history-item');
  if (item) {
    document.querySelectorAll('.history-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    closeMobileSidebar();
  }
});


/* ============================================================
   ─── Mobile Sidebar ───
   ============================================================ */
function openMobileSidebar() {
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeMobileSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

mobileMenu.addEventListener('click', () => {
  sidebar.classList.contains('open') ? closeMobileSidebar() : openMobileSidebar();
});

sidebarOverlay.addEventListener('click', closeMobileSidebar);


/* ─── Init ─── */
userInput.focus();
userInput.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        sendMessage();
    }
});