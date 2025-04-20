// routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

// 회원가입
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, language } = req.body;
    
    // 이메일 또는 사용자 이름 중복 확인
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        message: '이미 사용 중인 이메일 또는 사용자 이름입니다' 
      });
    }
    
    // 새 사용자 생성
    const user = new User({
      username,
      email,
      password,
      language: language || 'ko'
    });
    
    await user.save();
    
    // JWT 토큰 생성
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        language: user.language,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    console.error('회원가입 에러:', error);
    res.status(500).json({ message: '서버 오류' });
  }
});

// 로그인
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // 사용자 찾기
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: '잘못된 이메일 또는 비밀번호입니다' });
    }
    
    // 비밀번호 확인
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: '잘못된 이메일 또는 비밀번호입니다' });
    }
    
    // 사용자 상태 업데이트
    user.isOnline = true;
    user.lastSeen = Date.now();
    await user.save();
    
    // JWT 토큰 생성
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        language: user.language,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    console.error('로그인 에러:', error);
    res.status(500).json({ message: '서버 오류' });
  }
});

// 사용자 정보 가져오기
router.get('/user', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('사용자 정보 가져오기 에러:', error);
    res.status(500).json({ message: '서버 오류' });
  }
});

// 로그아웃
router.post('/logout', auth, async (req, res) => {
  try {
    // 사용자 상태 업데이트
    await User.findByIdAndUpdate(req.user.id, {
      isOnline: false,
      lastSeen: Date.now()
    });
    
    res.json({ message: '로그아웃 성공' });
  } catch (error) {
    console.error('로그아웃 에러:', error);
    res.status(500).json({ message: '서버 오류' });
  }
});

module.exports = router;

// routes/users.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// 모든 사용자 가져오기
router.get('/', auth, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    console.error('사용자 목록 가져오기 에러:', error);
    res.status(500).json({ message: '서버 오류' });
  }
});

// 특정 사용자 가져오기
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('사용자 정보 가져오기 에러:', error);
    res.status(500).json({ message: '서버 오류' });
  }
});

// 사용자 정보 업데이트
router.put('/:id', auth, async (req, res) => {
  try {
    // 자신의 정보만 수정 가능
    if (req.user.id !== req.params.id) {
      return res.status(403).json({ message: '권한이 없습니다' });
    }
    
    const { username, language, profilePicture } = req.body;
    
    // 업데이트할 필드만 포함
    const updateData = {};
    if (username) updateData.username = username;
    if (language) updateData.language = language;
    if (profilePicture) updateData.profilePicture = profilePicture;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    ).select('-password');
    
    res.json(user);
  } catch (error) {
    console.error('사용자 정보 업데이트 에러:', error);
    res.status(500).json({ message: '서버 오류' });
  }
});

module.exports = router;

// routes/rooms.js
const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const Message = require('../models/Message');
const auth = require('../middleware/auth');

// 사용자가 참여한 모든 채팅방 가져오기
router.get('/', auth, async (req, res) => {
  try {
    const rooms = await Room.find({ 
      participants: { $in: [req.user.id] } 
    })
    .populate('participants', 'username profilePicture isOnline')
    .populate('lastMessage')
    .sort({ updatedAt: -1 });
    
    res.json(rooms);
  } catch (error) {
    console.error('채팅방 목록 가져오기 에러:', error);
    res.status(500).json({ message: '서버 오류' });
  }
});

// 새 채팅방 생성
router.post('/', auth, async (req, res) => {
  try {
    const { name, type, participants } = req.body;
    
    // 필수 필드 검증
    if (!name || !type) {
      return res.status(400).json({ message: '필수 필드가 누락되었습니다' });
    }
    
    // 참여자에 자신 추가
    const allParticipants = [...new Set([req.user.id, ...participants])];
    
    const room = new Room({
      name,
      type,
      creator: req.user.id,
      participants: allParticipants,
      admins: [req.user.id]
    });
    
    await room.save();
    
    // 상세 정보를 위해 참여자 정보 포함
    const populatedRoom = await Room.findById(room._id)
      .populate('participants', 'username profilePicture isOnline');
    
    res.status(201).json(populatedRoom);
  } catch (error) {
    console.error('채팅방 생성 에러:', error);
    res.status(500).json({ message: '서버 오류' });
  }
});

// 특정 채팅방 정보 가져오기
router.get('/:id', auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate('participants', 'username profilePicture isOnline')
      .populate('admins', 'username');
    
    if (!room) {
      return res.status(404).json({ message: '채팅방을 찾을 수 없습니다' });
    }
    
    // 권한 확인 (참여자만 접근 가능)
    if (!room.participants.some(p => p._id.toString() === req.user.id)) {
      return res.status(403).json({ message: '이 채팅방에 접근할 권한이 없습니다' });
    }
    
    res.json(room);
  } catch (error) {
    console.error('채팅방 정보 가져오기 에러:', error);
    res.status(500).json({ message: '서버 오류' });
  }
});

// 채팅방 정보 업데이트
router.put('/:id', auth, async (req, res) => {
  try {
    const { name } = req.body;
    const room = await Room.findById(req.params.id);
    
    if (!room) {
      return res.status(404).json({ message: '채팅방을 찾을 수 없습니다' });
    }
    
    // 권한 확인 (관리자만 수정 가능)
    if (!room.admins.includes(req.user.id)) {
      