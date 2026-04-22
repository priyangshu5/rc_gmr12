// ==================== CONFIGURATION ====================
// PASTE YOUR OPENROUTER API KEY HERE (inside the quotes)
const OPENROUTER_API_KEY = "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";
const MODEL = "openai/gpt-oss-120b:free";

// System prompt defines Flaxxy's personality
const SYSTEM_PROMPT = {
  role: "system",
  content: `Your name is Flaxxy. You represent RC GAMER 12 (username rc_gmr12). 
You are a smart, stylish, confident AI assistant with gamer energy. 
Speak in a cool, modern tone — friendly but serious, helpful and professional. 
Keep answers useful, clean, and concise. Use phrases like "Yo, kya scene hai?" or "Ready when you are." but adapt to context. 
Always maintain a premium gamer vibe.`
};

// ==================== DOM ELEMENTS ====================
const enterOverlay = document.getElementById('enterOverlay');
const enterBtn = document.getElementById('enterBtn');
const mainApp = document.getElementById('mainApp');
const bgMusic = document.getElementById('bgMusic');
const musicToggleBtn = document.getElementById('musicToggleBtn');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const clearChatBtn = document.getElementById('clearChatBtn');
const typingIndicator = document.getElementById('typingIndicator');
const cursorGlow = document.getElementById('cursorGlow');

// ==================== STATE ====================
let conversationHistory = [SYSTEM_PROMPT];
let isMusicPlaying = false;
let isWaitingForResponse = false;
let musicInitialized = false;

// ==================== INITIAL SETUP ====================
// Set music volume low (20%)
bgMusic.volume = 0.2;

// Welcome message (will be shown after Enter)
const WELCOME_MESSAGE = {
  role: "assistant",
  content: "👾 Yo! Flaxxy online. RC GAMER 12 ka personal AI. Kya scene hai? Ready when you are."
};

// ==================== ENTER BUTTON ====================
enterBtn.addEventListener('click', async () => {
  // Fade out overlay
  enterOverlay.classList.add('fade-out');
  
  // Show main app
  mainApp.classList.remove('hidden');
  
  // Initialize music (must be after user gesture)
  try {
    await bgMusic.play();
    isMusicPlaying = true;
    musicInitialized = true;
    musicToggleBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
  } catch (err) {
    console.log("Autoplay blocked, user can toggle music manually.");
    isMusicPlaying = false;
  }
  
  // Add welcome message to chat
  addMessageToChat('bot', WELCOME_MESSAGE.content);
  conversationHistory.push(WELCOME_MESSAGE);
  
  // Enable input
  chatInput.focus();
});

// ==================== MUSIC TOGGLE ====================
musicToggleBtn.addEventListener('click', () => {
  if (!musicInitialized) {
    // First interaction: initialize and play
    bgMusic.play().then(() => {
      isMusicPlaying = true;
      musicInitialized = true;
      musicToggleBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
    }).catch(e => console.log("Play failed"));
    return;
  }
  
  if (isMusicPlaying) {
    bgMusic.pause();
    isMusicPlaying = false;
    musicToggleBtn.innerHTML = '<i class="fas fa-music"></i>';
  } else {
    bgMusic.play();
    isMusicPlaying = true;
    musicToggleBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
  }
});

// ==================== CHAT FUNCTIONALITY ====================
// Add a message to the UI
function addMessageToChat(role, content, isError = false) {
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('message', role);
  if (isError) messageDiv.classList.add('error');
  
  const contentDiv = document.createElement('div');
  contentDiv.classList.add('message-content');
  contentDiv.textContent = content;
  
  messageDiv.appendChild(contentDiv);
  
  // Add retry button if error
  if (isError) {
    const retryBtn = document.createElement('button');
    retryBtn.classList.add('retry-btn');
    retryBtn.innerHTML = '<i class="fas fa-redo-alt"></i> Retry';
    retryBtn.addEventListener('click', () => {
      // Remove this error message and retry last user message
      messageDiv.remove();
      // Find last user message
      const lastUserMsg = [...conversationHistory].reverse().find(m => m.role === 'user');
      if (lastUserMsg) {
        sendMessageToAI(lastUserMsg.content);
      }
    });
    messageDiv.appendChild(retryBtn);
  }
  
  chatMessages.appendChild(messageDiv);
  scrollToBottom();
}

// Scroll chat to bottom
function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Show/hide typing indicator
function setTyping(isTyping) {
  if (isTyping) {
    typingIndicator.classList.add('active');
  } else {
    typingIndicator.classList.remove('active');
  }
}

// Disable/enable input during API call
function setInputEnabled(enabled) {
  chatInput.disabled = !enabled;
  sendBtn.disabled = !enabled;
}

// Clear chat (keep system prompt)
function resetChat() {
  conversationHistory = [SYSTEM_PROMPT];
  chatMessages.innerHTML = '';
  addMessageToChat('bot', WELCOME_MESSAGE.content);
  conversationHistory.push(WELCOME_MESSAGE);
}

// Send message to OpenRouter API
async function sendMessageToAI(userMessage) {
  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY.includes("PASTE_YOUR")) {
    addMessageToChat('bot', "⚠️ API key missing. Please paste your OpenRouter key in script.js", true);
    return;
  }
  
  setTyping(true);
  setInputEnabled(false);
  
  // Add user message to conversation
  const userMsgObj = { role: "user", content: userMessage };
  conversationHistory.push(userMsgObj);
  
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": window.location.origin, // Optional but recommended
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        messages: conversationHistory,
        temperature: 0.7,
        max_tokens: 12000
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || "API request failed");
    }
    
    const aiMessage = data.choices[0].message.content;
    
    // Add AI response to conversation and UI
    const aiMsgObj = { role: "assistant", content: aiMessage };
    conversationHistory.push(aiMsgObj);
    addMessageToChat('bot', aiMessage);
    
  } catch (error) {
    console.error("API Error:", error);
    addMessageToChat('bot', `⚠️ Error: ${error.message}. Click retry.`, true);
    // Remove the user message from history if we want to retry? Keep it, retry will resend.
  } finally {
    setTyping(false);
    setInputEnabled(true);
    chatInput.focus();
  }
}

// Handle send button click
function handleSendMessage() {
  const message = chatInput.value.trim();
  if (!message || isWaitingForResponse) return;
  
  // Display user message
  addMessageToChat('user', message);
  chatInput.value = '';
  
  // Send to AI
  sendMessageToAI(message);
}

// ==================== EVENT LISTENERS ====================
sendBtn.addEventListener('click', handleSendMessage);
chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSendMessage();
  }
});

clearChatBtn.addEventListener('click', () => {
  resetChat();
});

// ==================== CURSOR GLOW EFFECT ====================
document.addEventListener('mousemove', (e) => {
  cursorGlow.style.left = e.clientX + 'px';
  cursorGlow.style.top = e.clientY + 'px';
  cursorGlow.style.opacity = '1';
});

document.addEventListener('mouseleave', () => {
  cursorGlow.style.opacity = '0';
});

// ==================== HERO IMAGE HOVER MOVEMENT (subtle) ====================
const heroImage = document.getElementById('heroImage');
if (heroImage) {
  heroImage.addEventListener('mousemove', (e) => {
    const rect = heroImage.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width/2;
    const y = e.clientY - rect.top - rect.height/2;
    heroImage.style.transform = `perspective(500px) rotateY(${x/20}deg) rotateX(${-y/20}deg) scale(1.02)`;
  });
  heroImage.addEventListener('mouseleave', () => {
    heroImage.style.transform = 'perspective(500px) rotateY(0deg) rotateX(0deg) scale(1)';
  });
}

// ==================== ADDITIONAL: RETRY FOR FAILED MESSAGES ====================
// Already handled via retry button in addMessageToChat

// ==================== PREVENT EMPTY API KEY WARNING ====================
if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === "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") {
  console.warn("⚠️ Remember to paste your OpenRouter API key in script.js");
}