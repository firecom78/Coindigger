// server.js - 메인 서버 파일

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { Translate } = require('@google-cloud/translate').v2;

// 라우트 가져오기
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const roomRoutes = require('./routes/rooms');
const messageRoutes = require('./routes/messages');

// 환경변수 설정
dotenv.config();

// MongoDB 연결
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB 연결 성공'))
.catch(err => console.error('MongoDB 연결 실패:', err));

// Google Cloud Translation 초기화
const translate = new Translate({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  key: process.env.GOOGLE_CLOUD_API_KEY
});

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// 미들웨어
app.use(cors());
app.use(express.json());

// 라우트
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/messages', messageRoutes);

// 소켓 연결
const onlineUsers = new Map(); // userId: socketId
const userRooms = new Map(); // socketId: [roomIds]

io.on('connection', (socket) => {
  console.log('New client connected', socket.id);
  
  // 사용자 접속
  socket.on('user_connected', (userId) => {
    onlineUsers.set(userId, socket.id);
    userRooms.set(socket.id, []);
    io.emit('user_status_changed', { userId, status: 'online' });
  });

  // 채팅방 입장
  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`User joined room: ${roomId}`);
    
    // 사용자의 방 목록에 추가
    const userRoomList = userRooms.get(socket.id) || [];
    if (!userRoomList.includes(roomId)) {
      userRoomList.push(roomId);
      userRooms.set(socket.id, userRoomList);
    }
    
    // 방의 다른 사용자들에게 알림
    socket.to(roomId).emit('user_joined', { roomId, socketId: socket.id });
  });

  // 채팅방 퇴장
  socket.on('leave_room', (roomId) => {
    socket.leave(roomId);
    console.log(`User left room: ${roomId}`);
    
    // 사용자의 방 목록에서 제거
    const userRoomList = userRooms.get(socket.id) || [];
    const updatedRoomList = userRoomList.filter(id => id !== roomId);
    userRooms.set(socket.id, updatedRoomList);
    
    // 방의 다른 사용자들에게 알림
    socket.to(roomId).emit('user_left', { roomId, socketId: socket.id });
  });

  // 메시지 전송
  socket.on('send_message', async (data) => {
    try {
      const { roomId, senderId, content, originalLanguage } = data;
      
      // 번역 작업
      const translations = await translateMessage(content, originalLanguage);
      
      // 데이터베이스에 메시지 저장 (메시지 라우트에서 처리)
      const messageData = {
        roomId,
        sender: senderId,
        content,
        originalLanguage,
        translations,
        readBy: [senderId], // 보낸 사람은 이미 읽음
        createdAt: new Date()
      };
      
      // 클라이언트에게 메시지 전송
      io.to(roomId).emit('receive_message', messageData);
    } catch (error) {
      console.error('메시지 전송 에러:', error);
    }
  });

  // 메시지 읽음 표시
  socket.on('mark_read', async (data) => {
    try {
      const { messageId, userId, roomId } = data;
      
      // 데이터베이스에서 메시지 읽음 상태 업데이트 (메시지 라우트에서 처리)
      
      // 채팅방의 모든 사용자에게 읽음 상태 업데이트 알림
      io.to(roomId).emit('message_read', { messageId, userId });
    } catch (error) {
      console.error('메시지 읽음 표시 에러:', error);
    }
  });

  // 연결 종료
  socket.on('disconnect', () => {
    console.log('Client disconnected', socket.id);
    
    // 사용자 ID 찾기
    let disconnectedUserId = null;
    for (const [userId, sockId] of onlineUsers.entries()) {
      if (sockId === socket.id) {
        disconnectedUserId = userId;
        break;
      }
    }
    
    // 온라인 사용자 목록에서 제거
    if (disconnectedUserId) {
      onlineUsers.delete(disconnectedUserId);
      io.emit('user_status_changed', { userId: disconnectedUserId, status: 'offline' });
    }
    
    // 사용자의 방 목록 제거
    userRooms.delete(socket.id);
  });
});

// 메시지 번역 함수
async function translateMessage(text, sourceLanguage) {
  try {
    const targetLanguages = ['en', 'ko', 'ms']; // 영어, 한국어, 말레이어
    const translations = {};
    
    for (const targetLang of targetLanguages) {
      if (targetLang !== sourceLanguage) {
        const [translation] = await translate.translate(text, {
          from: sourceLanguage,
          to: targetLang
        });
        translations[targetLang] = translation;
      }
    }
    
    // 원본 언어도 translations에 추가
    translations[sourceLanguage] = text;
    
    return translations;
  } catch (error) {
    console.error('번역 에러:', error);
    return { error: '번역 실패' };
  }
}

// 서버 시작
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다`);
});
