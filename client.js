const socket = io();
let currentUser = null;
let currentFriend = null;
let musicPlaylist = [];
let currentTrackIndex = 0;
let audioPlayer = new Audio();

// WebRTC
let localStream = null;
let peerConnection = null;
let callActive = false;
let callTarget = null;

// DOM элементы
const authScreen = document.getElementById('authScreen');
const mainScreen = document.getElementById('mainScreen');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
const regUsername = document.getElementById('regUsername');
const regPassword = document.getElementById('regPassword');
const authTabs = document.querySelectorAll('.auth-tab');
const logoutBtn = document.getElementById('logoutBtn');
const navBtns = document.querySelectorAll('.nav-btn');
const tabs = document.querySelectorAll('.tab-content');

// Профиль
const profileAvatarImg = document.getElementById('profileAvatarImg');
const avatarUploadInput = document.getElementById('avatarUploadInput');
const profileDisplayName = document.getElementById('profileDisplayName');
const profileBirthDate = document.getElementById('profileBirthDate');
const profileBio = document.getElementById('profileBio');
const saveProfileBtn = document.getElementById('saveProfileBtn');

// Чат
const friendsListContainer = document.getElementById('friendsListContainer');
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const attachMediaBtn = document.getElementById('attachMediaBtn');
const chatHeader = document.getElementById('chatHeader');
const chatInputArea = document.getElementById('chatInputArea');
const callBtn = document.getElementById('callBtn');

// Друзья
const friendsListFull = document.getElementById('friendsListFull');
const friendRequestsList = document.getElementById('friendRequestsList');
const friendUsernameInput = document.getElementById('friendUsername');
const addFriendBtn = document.getElementById('addFriendBtn');

// Музыка
const musicUploadInput = document.getElementById('musicUploadInput');
const uploadMusicBtn = document.getElementById('uploadMusicBtn');
const musicListDiv = document.getElementById('musicList');

// Новости
const newsTitle = document.getElementById('newsTitle');
const newsContent = document.getElementById('newsContent');
const newsImage = document.getElementById('newsImage');
const publishNewsBtn = document.getElementById('publishNewsBtn');
const newsFeed = document.getElementById('newsFeed');

// Уведомления
const notificationCenter = document.getElementById('notificationCenter');
const notificationsList = document.getElementById('notificationsList');
const closeNotificationsBtn = document.getElementById('closeNotificationsBtn');
let notifications = [];

// Глобальный плеер
const globalPlayer = document.getElementById('globalPlayer');
const playerPlayBtn = document.getElementById('playerPlayBtn');
const playerPrevBtn = document.getElementById('playerPrevBtn');
const playerNextBtn = document.getElementById('playerNextBtn');
const playerProgress = document.getElementById('playerProgress');
const playerTime = document.getElementById('playerTime');
const playerTrackName = document.getElementById('playerTrackName');
const playerMusicUpload = document.getElementById('playerMusicUpload');

// Модалка звонка
const callModal = document.getElementById('callModal');
const callTargetNameSpan = document.getElementById('callTargetName');
const closeCallModalBtn = document.getElementById('closeCallModal');
const acceptCallBtn = document.getElementById('acceptCallBtn');
const rejectCallBtn = document.getElementById('rejectCallBtn');
const hangupCallBtn = document.getElementById('hangupCallBtn');
const callStatusSpan = document.getElementById('callStatus');
const remoteAudio = document.getElementById('remoteAudio');

// Вспомогательные элементы
const avatarImg = document.getElementById('avatarImg');
const userDisplayNameSpan = document.getElementById('userDisplayName');

// Тема
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeMenu = document.getElementById('themeMenu');
const themeOptions = document.querySelectorAll('.theme-option');

// ==================== ЗВУКИ ====================
function playNotificationSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.frequency.value = 800;
        gainNode.gain.value = 0.2;
        oscillator.type = 'sine';
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.3);
        oscillator.stop(audioCtx.currentTime + 0.3);
    } catch (e) { }
}

function playLogoAppearSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.frequency.value = 523.25;
        gainNode.gain.value = 0.3;
        oscillator.type = 'sine';
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.4);
        oscillator.stop(audioCtx.currentTime + 0.4);
    } catch (e) { }
}

// ==================== УВЕДОМЛЕНИЯ ====================
function addNotification(message, type = 'info', onClick = null) {
    notifications.unshift({ message, type, onClick, id: Date.now() });
    renderNotifications();
    playNotificationSound();
    if (!notificationCenter.classList.contains('open')) {
        notificationCenter.classList.add('open');
        setTimeout(() => {
            if (notifications.length === 0) notificationCenter.classList.remove('open');
        }, 5000);
    }
}

function renderNotifications() {
    notificationsList.innerHTML = '';
    notifications.forEach(notif => {
        const div = document.createElement('div');
        div.className = 'notification-item';
        div.textContent = notif.message;
        if (notif.onClick) {
            div.style.cursor = 'pointer';
            div.addEventListener('click', notif.onClick);
        }
        notificationsList.appendChild(div);
    });
}

closeNotificationsBtn.addEventListener('click', () => {
    notificationCenter.classList.remove('open');
});

// ==================== МУЗЫКА (без автовоспроизведения) ====================
function initPlayer() {
    audioPlayer.addEventListener('timeupdate', () => {
        if (audioPlayer.duration) {
            playerProgress.value = (audioPlayer.currentTime / audioPlayer.duration) * 100;
            playerTime.textContent = `${formatTime(audioPlayer.currentTime)} / ${formatTime(audioPlayer.duration)}`;
        }
    });
    audioPlayer.addEventListener('ended', () => {
        if (musicPlaylist.length && playerPlayBtn.textContent === '⏸') {
            playNext();
        }
    });
    playerProgress.addEventListener('input', () => {
        if (audioPlayer.duration) {
            audioPlayer.currentTime = (playerProgress.value / 100) * audioPlayer.duration;
        }
    });
    playerPlayBtn.addEventListener('click', () => {
        if (musicPlaylist.length === 0) return;
        if (audioPlayer.paused) {
            audioPlayer.play();
            playerPlayBtn.textContent = '⏸';
        } else {
            audioPlayer.pause();
            playerPlayBtn.textContent = '▶';
        }
    });
    playerPrevBtn.addEventListener('click', () => {
        if (musicPlaylist.length) playPrev();
    });
    playerNextBtn.addEventListener('click', () => {
        if (musicPlaylist.length) playNext();
    });
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function playTrack(index) {
    if (index < 0) index = 0;
    if (index >= musicPlaylist.length) index = 0;
    if (musicPlaylist.length === 0) return;
    currentTrackIndex = index;
    const track = musicPlaylist[currentTrackIndex];
    audioPlayer.src = track.url;
    audioPlayer.play().catch(e => console.log(e));
    playerPlayBtn.textContent = '⏸';
    playerTrackName.textContent = track.originalName;
}

function playNext() {
    if (musicPlaylist.length) {
        playTrack((currentTrackIndex + 1) % musicPlaylist.length);
    }
}

function playPrev() {
    if (musicPlaylist.length) {
        playTrack((currentTrackIndex - 1 + musicPlaylist.length) % musicPlaylist.length);
    }
}

async function loadMusicForPlayer() {
    const res = await fetch('/api/music');
    musicPlaylist = await res.json();
    if (musicPlaylist.length) {
        playerTrackName.textContent = musicPlaylist[0].originalName;
    }
}

playerMusicUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('music', file);
    formData.append('username', currentUser);
    const res = await fetch('/api/upload-music', { method: 'POST', body: formData });
    if (res.ok) {
        addNotification('Трек загружен!', 'success');
        loadMusic();
        loadMusicForPlayer();
    } else {
        alert('Ошибка загрузки');
    }
    playerMusicUpload.value = '';
});

// ==================== WEBRTC ЗВОНКИ ====================
const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

async function startCall(targetUsername) {
    if (callActive) return;
    callTarget = targetUsername;
    callTargetNameSpan.textContent = targetUsername;
    callModal.classList.remove('hidden');
    callStatusSpan.textContent = 'Начинаем звонок...';
    acceptCallBtn.classList.add('hidden');
    rejectCallBtn.classList.add('hidden');
    hangupCallBtn.classList.add('hidden');

    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        peerConnection = new RTCPeerConnection(configuration);
        peerConnection.addStream(localStream);
        peerConnection.onaddstream = (event) => {
            remoteAudio.srcObject = event.stream;
        };
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice-candidate', {
                    to: targetUsername,
                    from: currentUser,
                    candidate: event.candidate
                });
            }
        };
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('call-user', { to: targetUsername, from: currentUser, offer: offer });
        callStatusSpan.textContent = 'Звоним...';
        hangupCallBtn.classList.remove('hidden');
    } catch (err) {
        console.error(err);
        callStatusSpan.textContent = 'Не удалось получить доступ к микрофону';
        setTimeout(() => closeCallModal(), 2000);
    }
}

function answerCall(from, offer) {
    callTarget = from;
    callTargetNameSpan.textContent = from;
    callModal.classList.remove('hidden');
    callStatusSpan.textContent = `Входящий звонок от ${from}`;
    acceptCallBtn.classList.remove('hidden');
    rejectCallBtn.classList.remove('hidden');
    hangupCallBtn.classList.add('hidden');

    acceptCallBtn.onclick = async () => {
        try {
            localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            peerConnection = new RTCPeerConnection(configuration);
            peerConnection.addStream(localStream);
            peerConnection.onaddstream = (event) => {
                remoteAudio.srcObject = event.stream;
            };
            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('ice-candidate', {
                        to: from,
                        from: currentUser,
                        candidate: event.candidate
                    });
                }
            };
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            socket.emit('make-answer', { to: from, from: currentUser, answer: answer });
            callStatusSpan.textContent = 'Разговор...';
            acceptCallBtn.classList.add('hidden');
            rejectCallBtn.classList.add('hidden');
            hangupCallBtn.classList.remove('hidden');
            callActive = true;
        } catch (err) {
            console.error(err);
            closeCallModal();
        }
    };

    rejectCallBtn.onclick = () => {
        closeCallModal();
    };
}

function closeCallModal() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    callActive = false;
    callModal.classList.add('hidden');
    remoteAudio.srcObject = null;
}

hangupCallBtn.onclick = () => {
    closeCallModal();
};

closeCallModalBtn.onclick = closeCallModal;

socket.on('call-made', async (data) => {
    if (callActive) return;
    answerCall(data.from, data.offer);
});
socket.on('answer-made', async (data) => {
    if (peerConnection && !callActive) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
        callActive = true;
        callStatusSpan.textContent = 'Разговор...';
        acceptCallBtn.classList.add('hidden');
        rejectCallBtn.classList.add('hidden');
        hangupCallBtn.classList.remove('hidden');
    }
});
socket.on('ice-candidate', (data) => {
    if (peerConnection) {
        peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
});

// ==================== ТЕМА ====================
function setTheme(theme) {
    document.body.classList.remove('theme-pink', 'theme-dark', 'theme-light');
    document.body.classList.add(`theme-${theme}`);
    localStorage.setItem('sosiska_theme', theme);
}
const savedTheme = localStorage.getItem('sosiska_theme');
if (savedTheme && ['pink', 'dark', 'light'].includes(savedTheme)) {
    setTheme(savedTheme);
} else {
    setTheme('dark');
}
themeToggleBtn.addEventListener('click', () => {
    themeMenu.classList.toggle('open');
});
themeOptions.forEach(opt => {
    opt.addEventListener('click', () => {
        setTheme(opt.dataset.theme);
        themeMenu.classList.remove('open');
    });
});
document.addEventListener('click', (e) => {
    if (!themeToggleBtn.contains(e.target) && !themeMenu.contains(e.target)) {
        themeMenu.classList.remove('open');
    }
});

// Скрытый input для медиа
let mediaInput = document.getElementById('mediaInput');
if (!mediaInput) {
    mediaInput = document.createElement('input');
    mediaInput.type = 'file';
    mediaInput.id = 'mediaInput';
    mediaInput.accept = 'image/*,video/*';
    mediaInput.style.display = 'none';
    document.body.appendChild(mediaInput);
}

// Переключение вкладок
navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;
        navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        tabs.forEach(tab => {
            tab.classList.remove('active');
        });
        const targetTab = document.getElementById(`${tabId}Tab`);
        if (targetTab) targetTab.classList.add('active');
        if (tabId === 'chat') loadFriendsList();
        if (tabId === 'music') loadMusic();
        if (tabId === 'profile') loadProfile();
        if (tabId === 'friends') loadFriendsAndRequests();
        if (tabId === 'news') loadNews();
    });
});

// ==================== ЧАТ ====================
async function loadFriendsList() {
    if (!currentUser) return;
    const res = await fetch(`/api/user/${currentUser}`);
    const user = await res.json();
    friendsListContainer.innerHTML = '';
    if (!user.friends || user.friends.length === 0) {
        friendsListContainer.innerHTML = '<div class="placeholder-message">У вас пока нет друзей. Добавьте их в разделе "Друзья".</div>';
        return;
    }
    for (const friendName of user.friends) {
        const friendRes = await fetch(`/api/user/${friendName}`);
        const friend = await friendRes.json();
        const div = document.createElement('div');
        div.className = 'friend-item';
        div.innerHTML = `
            <img src="${friend.avatar || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23fff"%3E%3Cpath d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/%3E%3C/svg%3E'}" class="avatar-small">
            <span>${friend.displayName}</span>
        `;
        div.addEventListener('click', () => openChat(friendName, friend.displayName, friend.avatar));
        friendsListContainer.appendChild(div);
    }
}

async function openChat(friendName, displayName, avatar) {
    currentFriend = { username: friendName, displayName, avatar };
    chatHeader.textContent = `Чат с ${displayName}`;
    chatInputArea.classList.remove('hidden');
    callBtn.classList.remove('hidden');
    await loadMessages(friendName);
}

callBtn.addEventListener('click', () => {
    if (currentFriend) startCall(currentFriend.username);
});

async function loadMessages(withUser) {
    const res = await fetch(`/api/messages/${currentUser}/${withUser}`);
    const messages = await res.json();
    messagesContainer.innerHTML = '';
    if (messages.length === 0) {
        messagesContainer.innerHTML = '<div class="placeholder-message">Напишите первое сообщение 💬</div>';
    } else {
        messages.forEach(msg => displayMessage(msg, msg.from === currentUser));
    }
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function displayMessage(msg, isOwn) {
    const div = document.createElement('div');
    div.className = `message ${isOwn ? 'own' : ''}`;
    const avatar = document.createElement('img');
    avatar.className = 'message-avatar';
    avatar.src = msg.avatar || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23fff"%3E%3Cpath d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/%3E%3C/svg%3E';
    div.appendChild(avatar);
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    textDiv.textContent = msg.text;
    contentDiv.appendChild(textDiv);
    const timeSpan = document.createElement('div');
    timeSpan.className = 'message-time';
    timeSpan.textContent = new Date(msg.timestamp).toLocaleTimeString();
    contentDiv.appendChild(timeSpan);
    div.appendChild(contentDiv);
    messagesContainer.appendChild(div);
}

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

async function sendMessage() {
    if (!currentFriend) return;
    const text = messageInput.value.trim();
    if (!text) return;
    const msg = {
        from: currentUser,
        to: currentFriend.username,
        text,
        timestamp: Date.now(),
        avatar: avatarImg.src
    };
    socket.emit('sendPrivateMessage', msg);
    messageInput.value = '';
    displayMessage(msg, true);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

socket.on('newPrivateMessage', (msg) => {
    if (currentFriend && (msg.from === currentFriend.username || msg.to === currentFriend.username)) {
        displayMessage(msg, msg.from === currentUser);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    if (msg.to === currentUser && msg.from !== currentUser) {
        addNotification(`Новое сообщение от ${msg.from}: ${msg.text.substring(0, 30)}...`, 'message', () => {
            const friendName = msg.from;
            fetch(`/api/user/${friendName}`).then(r => r.json()).then(friend => {
                openChat(friend.username, friend.displayName, friend.avatar);
                document.querySelector('.nav-btn[data-tab="chat"]').click();
            });
        });
    }
});

// ==================== ДРУЗЬЯ ====================
async function loadFriendsAndRequests() {
    if (!currentUser) return;
    const res = await fetch(`/api/user/${currentUser}`);
    const user = await res.json();
    friendsListFull.innerHTML = '';
    if (!user.friends || user.friends.length === 0) {
        friendsListFull.innerHTML = '<div class="placeholder-message">Нет друзей</div>';
    } else {
        for (const f of user.friends) {
            const friendRes = await fetch(`/api/user/${f}`);
            const friend = await friendRes.json();
            const div = document.createElement('div');
            div.className = 'friend-item';
            div.innerHTML = `<img src="${friend.avatar || ''}" class="avatar-small"> ${friend.displayName}`;
            friendsListFull.appendChild(div);
        }
    }
    friendRequestsList.innerHTML = '';
    if (!user.friendRequests || user.friendRequests.length === 0) {
        friendRequestsList.innerHTML = '<div class="placeholder-message">Нет заявок</div>';
    } else {
        for (const req of user.friendRequests) {
            const reqUserRes = await fetch(`/api/user/${req}`);
            const reqUser = await reqUserRes.json();
            const div = document.createElement('div');
            div.className = 'request-item';
            div.innerHTML = `<span>${reqUser.displayName}</span> <button class="accept-btn" data-name="${req}">Принять</button> <button class="decline-btn" data-name="${req}">Отклонить</button>`;
            friendRequestsList.appendChild(div);
        }
        document.querySelectorAll('.accept-btn').forEach(btn => {
            btn.addEventListener('click', () => acceptFriend(btn.dataset.name));
        });
        document.querySelectorAll('.decline-btn').forEach(btn => {
            btn.addEventListener('click', () => declineFriend(btn.dataset.name));
        });
    }
}

function acceptFriend(friendName) {
    socket.emit('acceptFriendRequest', { username: currentUser, friendName });
    loadFriendsAndRequests();
    addNotification(`Вы приняли заявку от ${friendName}`, 'success');
}

function declineFriend(friendName) {
    socket.emit('declineFriendRequest', { username: currentUser, friendName });
    loadFriendsAndRequests();
}

addFriendBtn.addEventListener('click', () => {
    const friend = friendUsernameInput.value.trim();
    if (!friend) return;
    socket.emit('sendFriendRequest', { from: currentUser, to: friend });
    friendUsernameInput.value = '';
    addNotification(`Заявка отправлена пользователю ${friend}`, 'info');
});

socket.on('friendRequestReceived', ({ from, to }) => {
    if (to === currentUser) {
        addNotification(`Новая заявка в друзья от ${from}`, 'friend', () => {
            document.querySelector('.nav-btn[data-tab="friends"]').click();
        });
        loadFriendsAndRequests();
    }
});

socket.on('friendRequestAccepted', ({ username, friendName }) => {
    if (username === currentUser) {
        addNotification(`Пользователь ${friendName} принял вашу заявку!`, 'success');
        loadFriendsList();
        loadFriendsAndRequests();
    } else if (friendName === currentUser) {
        addNotification(`Вы стали друзьями с ${username}`, 'success');
        loadFriendsList();
        loadFriendsAndRequests();
    }
});

// ==================== МУЗЫКА (вкладка) ====================
async function loadMusic() {
    const res = await fetch('/api/music');
    const music = await res.json();
    musicListDiv.innerHTML = '';
    music.forEach(track => {
        const div = document.createElement('div');
        div.className = 'music-track';
        div.innerHTML = `
            <div><strong>${escapeHtml(track.originalName)}</strong> (загрузил: ${track.uploadedBy})</div>
            <div class="custom-audio-player">
                <audio controls src="${track.url}"></audio>
                <button class="play-now-btn" data-url="${track.url}" data-name="${track.originalName}">🎵 Играть сейчас</button>
            </div>
        `;
        musicListDiv.appendChild(div);
    });
    document.querySelectorAll('.play-now-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const url = btn.dataset.url;
            const name = btn.dataset.name;
            const index = music.findIndex(t => t.url === url);
            if (index !== -1) {
                playTrack(index);
                addNotification(`Сейчас играет: ${name}`, 'info');
            }
        });
    });
}

uploadMusicBtn.addEventListener('click', () => musicUploadInput.click());
musicUploadInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('music', file);
    formData.append('username', currentUser);
    const res = await fetch('/api/upload-music', { method: 'POST', body: formData });
    if (res.ok) {
        addNotification('Трек загружен!', 'success');
        loadMusic();
        loadMusicForPlayer();
    } else {
        alert('Ошибка загрузки');
    }
    musicUploadInput.value = '';
});

// ==================== НОВОСТИ ====================
async function loadNews() {
    const res = await fetch('/api/news');
    const news = await res.json();
    newsFeed.innerHTML = '';
    news.forEach(item => {
        const div = document.createElement('div');
        div.className = 'news-item';
        div.innerHTML = `
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.content)}</p>
            ${item.imageUrl ? `<img src="${item.imageUrl}" alt="news">` : ''}
            <div class="news-meta">Автор: ${item.author} • ${new Date(item.createdAt).toLocaleString()}</div>
        `;
        newsFeed.appendChild(div);
    });
}

function escapeHtml(str) {
    return str.replace(/[&<>]/g, function (m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

publishNewsBtn.addEventListener('click', async () => {
    const title = newsTitle.value.trim();
    const content = newsContent.value.trim();
    if (!title || !content) {
        alert('Заполните заголовок и текст');
        return;
    }
    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    formData.append('author', currentUser);
    if (newsImage.files[0]) {
        formData.append('image', newsImage.files[0]);
    }
    const res = await fetch('/api/news', { method: 'POST', body: formData });
    if (res.ok) {
        newsTitle.value = '';
        newsContent.value = '';
        newsImage.value = '';
        loadNews();
        addNotification('Новость опубликована!', 'success');
    } else {
        alert('Ошибка публикации');
    }
});

socket.on('newNews', (news) => {
    loadNews();
    addNotification(`Новая новость: ${news.title}`, 'news');
});

// ==================== ПРОФИЛЬ ====================
async function loadProfile() {
    if (!currentUser) return;
    const res = await fetch(`/api/user/${currentUser}`);
    const user = await res.json();
    profileAvatarImg.src = user.avatar || '';
    profileDisplayName.value = user.displayName || '';
    profileBirthDate.value = user.birthDate || '';
    profileBio.value = user.bio || '';
}

saveProfileBtn.addEventListener('click', async () => {
    const displayName = profileDisplayName.value.trim();
    const birthDate = profileBirthDate.value;
    const bio = profileBio.value;
    const res = await fetch('/api/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser, displayName, birthDate, bio })
    });
    if (res.ok) {
        userDisplayNameSpan.textContent = displayName;
        addNotification('Профиль обновлён', 'success');
    } else alert('Ошибка');
});

avatarUploadInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    formData.append('username', currentUser);
    const res = await fetch('/api/upload-avatar', { method: 'POST', body: formData });
    const data = await res.json();
    if (res.ok) {
        avatarImg.src = data.avatar;
        profileAvatarImg.src = data.avatar;
        addNotification('Аватар обновлён', 'success');
    } else alert('Ошибка загрузки аватара');
});

// ==================== ВЫХОД ====================
logoutBtn.addEventListener('click', () => {
    currentUser = null;
    currentFriend = null;
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    if (peerConnection) peerConnection.close();
    authScreen.classList.remove('hidden');
    mainScreen.classList.add('hidden');
    globalPlayer.classList.add('hidden');
    audioPlayer.pause();
});

// ==================== РЕГИСТРАЦИЯ / ВХОД ====================
authTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        authTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        if (target === 'login') {
            loginForm.classList.remove('hidden');
            registerForm.classList.add('hidden');
        } else {
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
        }
    });
});

loginBtn.addEventListener('click', async () => {
    const username = loginUsername.value.trim();
    const password = loginPassword.value;
    const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (res.ok) {
        currentUser = data.username;
        userDisplayNameSpan.textContent = data.displayName;
        avatarImg.src = data.avatar || '';
        authScreen.classList.add('hidden');
        mainScreen.classList.remove('hidden');
        globalPlayer.classList.remove('hidden');
        socket.emit('register', currentUser);
        loadFriendsList();
        loadMusic();
        loadProfile();
        loadNews();
        loadMusicForPlayer();
        initPlayer();
    } else alert(data.error);
});

registerBtn.addEventListener('click', async () => {
    const username = regUsername.value.trim();
    const password = regPassword.value;
    const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (res.ok) {
        alert('Регистрация успешна! Теперь войдите.');
        authTabs[0].click();
    } else alert(data.error);
});

window.addEventListener('load', () => {
    playLogoAppearSound();
});