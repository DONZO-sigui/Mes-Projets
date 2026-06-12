const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const chatWindow = document.getElementById('chat-window');

const appendMessage = (content, className) => {
    const messageEl = document.createElement('div');
    messageEl.className = `message ${className}`;
    messageEl.textContent = content;
    chatWindow.appendChild(messageEl);
    chatWindow.scrollTop = chatWindow.scrollHeight;
};

// Scroll to bottom on load
if (chatWindow) {
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

chatForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const message = messageInput.value.trim();
    if (!message) {
        return;
    }

    appendMessage(message, 'user-message');
    messageInput.value = '';

    try {
        const response = await fetch('/chat/message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        });

        const data = await response.json();
        appendMessage(data.reply || 'Désolé, je n’ai pas pu répondre.', 'bot-message');
    } catch (error) {
        appendMessage('Erreur réseau. Réessaie plus tard.', 'bot-message');
        console.error(error);
    }
});
