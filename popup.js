let socket = null;
    let currentRoom = null;
    let userId = null;
    let username = null;
    let typingTimeout = null;

    const authContainer = document.getElementById('auth-container');
    const chatContainer = document.getElementById('chat-container');
    const usernameInput = document.getElementById('username-input');
    const authBtn = document.getElementById('auth-btn');
    const participantsDiv = document.getElementById('participants');
    const messagesDiv = document.getElementById('messages');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const voiceChatBtn = document.getElementById('voice-chat-btn');
    const typingIndicator = document.getElementById('typing-indicator');

    const showChat = () => {
      authContainer.classList.add('hidden');
      chatContainer.classList.remove('hidden');
    };

    const addMessage = (msg) => {
      const messageElement = document.createElement('div');
      messageElement.className = 'message';
      messageElement.innerHTML = `
        <span class="username">${msg.username}</span>
        <span class="timestamp">${new Date(msg.timestamp).toLocaleTimeString()}</span>
        <div>${msg.message}</div>
      `;
      messagesDiv.appendChild(messageElement);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    };

    const updateParticipants = (users) => {
      participantsDiv.textContent = `Online: ${users.size}`;
    };

    const showTyping = (username) => {
      typingIndicator.textContent = `${username} is typing...`;
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        typingIndicator.textContent = '';
      }, 2000);
    };

    authBtn.addEventListener('click', () => {
      const username = usernameInput.value.trim();
      if (username) {
        socket = io('http://localhost:3000');
        socket.emit('authenticate', { username }, (response) => {
          if (response.success) {
            userId = response.userId;
            showChat();
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              currentRoom = new URL(tabs[0].url).hostname;
              socket.emit('joinRoom', currentRoom);
            });
          } else {
            alert(response.error);
          }
        });
      }
    });

    messageInput.addEventListener('input', () => {
      if (messageInput.value) {
        socket.emit('startTyping', currentRoom);
      } else {
        socket.emit('stopTyping', currentRoom);
      }
    });

    sendBtn.addEventListener('click', () => {
      const message = messageInput.value.trim();
      if (message) {
        socket.emit('sendMessage', { room: currentRoom, message });
        messageInput.value = '';
      }
    });

    voiceChatBtn.addEventListener('click', () => {
      alert('Voice chat coming soon!');
    });

    socket?.on('roomHistory', (messages) => {
      messages.forEach(addMessage);
    });

    socket?.on('newMessage', addMessage);

    socket?.on('userJoined', (user) => {
      addMessage({
        username: 'System',
        message: `${user.username} joined`,
        timestamp: new Date().toISOString()
      });
    });

    socket?.on('userLeft', (userId) => {
      addMessage({
        username: 'System',
        message: 'A user left',
        timestamp: new Date().toISOString()
      });
    });

    socket?.on('userTyping', (user) => {
      showTyping(user.username);
    });

    socket?.on('userStoppedTyping', () => {
      typingIndicator.textContent = '';
    });
