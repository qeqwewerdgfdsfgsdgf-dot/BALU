const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const dataDir = path.join(__dirname, 'data');
const uploadsDir = path.join(__dirname, 'uploads');
const usersFile = path.join(dataDir, 'users.json');
const messagesFile = path.join(dataDir, 'private_messages.json');
const musicFile = path.join(dataDir, 'music.json');
const newsFile = path.join(dataDir, 'news.json');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
['avatars', 'media', 'music', 'news'].forEach(dir => {
    const full = path.join(uploadsDir, dir);
    if (!fs.existsSync(full)) fs.mkdirSync(full);
});

if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, JSON.stringify([]));
if (!fs.existsSync(messagesFile)) fs.writeFileSync(messagesFile, JSON.stringify([]));
if (!fs.existsSync(musicFile)) fs.writeFileSync(musicFile, JSON.stringify([]));
if (!fs.existsSync(newsFile)) fs.writeFileSync(newsFile, JSON.stringify([]));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let folder = 'media';
        if (req.url.includes('avatar')) folder = 'avatars';
        if (req.url.includes('music')) folder = 'music';
        if (req.url.includes('news')) folder = 'news';
        cb(null, path.join(uploadsDir, folder));
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, unique + path.extname(file.originalname));
    }
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadsDir));
app.use(express.json());

// Регистрация
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Имя и пароль обязательны' });
    let users = JSON.parse(fs.readFileSync(usersFile));
    if (users.find(u => u.username === username)) {
        return res.status(400).json({ error: 'Пользователь уже существует' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
        username,
        password: hashedPassword,
        displayName: username,
        avatar: null,
        birthDate: null,
        bio: '',
        friends: [],
        friendRequests: []
    };
    users.push(newUser);
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
    res.json({ success: true });
});

// Вход
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    let users = JSON.parse(fs.readFileSync(usersFile));
    const user = users.find(u => u.username === username);
    if (!user) return res.status(400).json({ error: 'Пользователь не найден' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'Неверный пароль' });
    res.json({ username: user.username, displayName: user.displayName, avatar: user.avatar });
});

// Загрузка аватара
app.post('/api/upload-avatar', upload.single('avatar'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Нет файла' });
    const { username } = req.body;
    const avatarPath = `/uploads/avatars/${req.file.filename}`;
    let users = JSON.parse(fs.readFileSync(usersFile));
    const userIndex = users.findIndex(u => u.username === username);
    if (userIndex !== -1) {
        users[userIndex].avatar = avatarPath;
        fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
        res.json({ avatar: avatarPath });
    } else {
        res.status(404).json({ error: 'Пользователь не найден' });
    }
});

// Обновление профиля
app.post('/api/update-profile', async (req, res) => {
    const { username, displayName, birthDate, bio } = req.body;
    let users = JSON.parse(fs.readFileSync(usersFile));
    const userIndex = users.findIndex(u => u.username === username);
    if (userIndex !== -1) {
        if (displayName) users[userIndex].displayName = displayName;
        if (birthDate) users[userIndex].birthDate = birthDate;
        if (bio !== undefined) users[userIndex].bio = bio;
        fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
        res.json({ success: true, displayName: users[userIndex].displayName });
    } else {
        res.status(404).json({ error: 'Пользователь не найден' });
    }
});

// Загрузка медиа для сообщений
app.post('/api/upload-media', upload.single('media'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Нет файла' });
    const fileUrl = `/uploads/media/${req.file.filename}`;
    res.json({ url: fileUrl, type: req.file.mimetype });
});

// Загрузка музыки
app.post('/api/upload-music', upload.single('music'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Нет файла' });
    const fileUrl = `/uploads/music/${req.file.filename}`;
    let musicList = JSON.parse(fs.readFileSync(musicFile));
    musicList.push({
        id: Date.now(),
        url: fileUrl,
        originalName: req.file.originalname,
        uploadedBy: req.body.username,
        uploadedAt: Date.now()
    });
    fs.writeFileSync(musicFile, JSON.stringify(musicList, null, 2));
    res.json({ success: true });
});

// Получить список музыки
app.get('/api/music', (req, res) => {
    const musicList = JSON.parse(fs.readFileSync(musicFile));
    res.json(musicList);
});

// Создание новости
app.post('/api/news', upload.single('image'), (req, res) => {
    const { title, content, author } = req.body;
    let imageUrl = null;
    if (req.file) {
        imageUrl = `/uploads/news/${req.file.filename}`;
    }
    const news = JSON.parse(fs.readFileSync(newsFile));
    const newPost = {
        id: Date.now(),
        title,
        content,
        author,
        imageUrl,
        createdAt: Date.now()
    };
    news.unshift(newPost);
    fs.writeFileSync(newsFile, JSON.stringify(news, null, 2));
    io.emit('newNews', newPost);
    res.json({ success: true });
});

// Получить новости
app.get('/api/news', (req, res) => {
    const news = JSON.parse(fs.readFileSync(newsFile));
    res.json(news);
});

// Получить список пользователей
app.get('/api/users', (req, res) => {
    let users = JSON.parse(fs.readFileSync(usersFile));
    const safeUsers = users.map(u => ({ username: u.username, displayName: u.displayName, avatar: u.avatar }));
    res.json(safeUsers);
});

// Получить данные текущего пользователя
app.get('/api/user/:username', (req, res) => {
    let users = JSON.parse(fs.readFileSync(usersFile));
    const user = users.find(u => u.username === req.params.username);
    if (!user) return res.status(404).json({ error: 'Не найден' });
    res.json({
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        birthDate: user.birthDate,
        bio: user.bio || '',
        friends: user.friends,
        friendRequests: user.friendRequests
    });
});

// Получить личные сообщения
app.get('/api/messages/:user1/:user2', (req, res) => {
    const { user1, user2 } = req.params;
    let messages = JSON.parse(fs.readFileSync(messagesFile));
    const filtered = messages.filter(m =>
        (m.from === user1 && m.to === user2) ||
        (m.from === user2 && m.to === user1)
    );
    res.json(filtered);
});

// Socket.IO
io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('register', (username) => {
        socket.username = username;
        socket.join(`user_${username}`);
    });

    socket.on('sendPrivateMessage', (msg) => {
        let messages = JSON.parse(fs.readFileSync(messagesFile));
        messages.push(msg);
        fs.writeFileSync(messagesFile, JSON.stringify(messages, null, 2));
        io.to(`user_${msg.from}`).to(`user_${msg.to}`).emit('newPrivateMessage', msg);
    });

    socket.on('sendFriendRequest', ({ from, to }) => {
        let users = JSON.parse(fs.readFileSync(usersFile));
        const recipient = users.find(u => u.username === to);
        if (recipient && !recipient.friendRequests.includes(from) && !recipient.friends.includes(from)) {
            recipient.friendRequests.push(from);
            fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
            io.to(`user_${to}`).emit('friendRequestReceived', { from, to });
        }
    });

    socket.on('acceptFriendRequest', ({ username, friendName }) => {
        let users = JSON.parse(fs.readFileSync(usersFile));
        const user = users.find(u => u.username === username);
        const friend = users.find(u => u.username === friendName);
        if (user && friend) {
            user.friendRequests = user.friendRequests.filter(f => f !== friendName);
            if (!user.friends.includes(friendName)) user.friends.push(friendName);
            if (!friend.friends.includes(username)) friend.friends.push(username);
            fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
            io.to(`user_${username}`).to(`user_${friendName}`).emit('friendRequestAccepted', { username, friendName });
        }
    });

    socket.on('declineFriendRequest', ({ username, friendName }) => {
        let users = JSON.parse(fs.readFileSync(usersFile));
        const user = users.find(u => u.username === username);
        if (user) {
            user.friendRequests = user.friendRequests.filter(f => f !== friendName);
            fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
        }
    });

    // WebRTC сигналинг
    socket.on('call-user', (data) => {
        io.to(`user_${data.to}`).emit('call-made', { from: data.from, offer: data.offer });
    });
    socket.on('make-answer', (data) => {
        io.to(`user_${data.to}`).emit('answer-made', { from: data.from, answer: data.answer });
    });
    socket.on('ice-candidate', (data) => {
        io.to(`user_${data.to}`).emit('ice-candidate', { from: data.from, candidate: data.candidate });
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});