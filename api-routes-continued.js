// routes/rooms.js 계속
      return res.status(403).json({ message: '채팅방 정보를 수정할 권한이 없습니다' });
    }
    
    room.name = name;
    await room.save();
    
    res.json(room);
  } catch (error) {
    console.error('채팅방 정보 업데이트 에러:', error);
    res.status(500).json({ message: '서버 오류' });
  }
});

// 채팅방 삭제
router.delete('/:id', auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    
    if (!room) {
      return res.status(404).json({ message: '채팅방을 찾을 수 없습니다' });
    }
    
    // 권한 확인 (생성자만 삭제 가능)
    if (room.creator.toString() !== req.user.id) {
      return res.status(403).json({ message: '채팅방을 삭제할 권한이 없습니다' });
    }
    
    // 관련 메시지도 모두 삭제
    await Message.deleteMany({ roomId: room._id });
    await room.remove();
    
    res.json({ message: '채팅방이 삭제되었습니다' });
  } catch (error) {
    console.error('채팅방 삭제 에러:', error);
    res.status(500).json({ message: '서버 오류' });
  }
});

// 채팅방에 사용자 추가
router.post('/:id/participants', auth, async (req, res) => {
  try {
    const { userId } = req.body;
    const room = await Room.findById(req.params.id);
    
    if (!room) {
      return res.status(404).json({ message: '채팅방을 찾을 수 없습니다' });
    }
    
    // 권한 확인 (관리자만 사용자 추가 가능)
    if (!room.admins.includes(req.user.id)) {
      return res.status(403).json({ message: '사용자를 추가할 권한이 없습니다' });
    }
    
    // 이미 참여 중인지 확인
    if (room.participants.includes(userId)) {
      return res.status(400).json({ message: '이미 채팅방에 참여 중인 사용자입니다' });
    }
    
    room.participants.push(userId);
    await room.save();
    
    const updatedRoom = await Room.findById(room._id)
      .populate('participants', 'username profilePicture isOnline');
    
    res.json(updatedRoom);
  } catch (error) {
    console.error('채팅방 사용자 추가 에러:', error);
    res.status(500).json({ message: '서버 오류' });
  }
});

// 채팅방에서 사용자 제거
router.delete('/:id/participants/:userId', auth, async (req, res) => {
  try {
    const { id, userId } = req.params;
    const room = await Room.findById(id);
    
    if (!room) {
      return res.status(404).json({ message: '채팅방을 찾을 수 없습니다' });
    }
    
    // 권한 확인 (자신을 제거하거나, 관리자가 다른 사용자 제거)
    const isSelfRemoval = userId === req.user.id;
    const isAdmin = room.admins.includes(req.user.id);
    
    if (!isSelfRemoval && !isAdmin) {
      return res.status(403).json({ message: '사용자를 제거할 권한이 없습니다' });
    }
    
    // 채팅방 생성자는 제거할 수 없음
    if (userId === room.creator.toString() && !isSelfRemoval) {
      return res.status(400).json({ message: '채팅방 생성자는 제거할 수 없습니다' });
    }
    
    // 참여자 목록에서 제거
    room.participants = room.participants.filter(p => p.toString() !== userId);
    
    // 관리자인 경우, 관리자 목록에서도 제거
    if (room.admins.includes(userId)) {
      room.admins = room.admins.filter(a => a.toString() !== userId);
    }
    
    await room.save();
    
    res.json({ message: '사용자가 채팅방에서 제거되었습니다' });
  } catch (error) {
    console.error('채팅방 사용자 제거 에러:', error);
    res.status(500).json({ message: '서버 오류' });
  }
});

module.exports = router;

// routes/messages.js
const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Room = require('../models/Room');
const auth = require('../middleware/auth');

// 특정 채팅방의 메시지 가져오기
router.get('/room/:roomId', auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 50, before } = req.query;
    
    // 채팅방 존재 여부 확인
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: '채팅방을 찾을 수 없습니다' });
    }
    
    // 권한 확인 (참여자만 메시지 조회 가능)
    if (!room.participants.includes(req.user.id)) {
      return res.status(403).json({ message: '이 채팅방의 메시지를 조회할 권한이 없습니다' });
    }
    
    // 쿼리 구성
    const query = { roomId };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }
    
    // 메시지 조회
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('sender', 'username profilePicture');
    
    // 응답 메시지 역순 정렬 (오래된 메시지부터)
    res.json(messages.reverse());
  } catch (error) {
    console.error('메시지 조회 에러:', error);
    res.status(500).json({ message: '서버 오류' });
  }
});

// 새 메시지 전송
router.post('/room/:roomId', auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content, originalLanguage, translations } = req.body;
    
    // 채팅방 존재 여부 확인
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: '채팅방을 찾을 수 없습니다' });
    }
    
    // 권한 확인 (참여자만 메시지 전송 가능)
    if (!room.participants.includes(req.user.id)) {
      return res.status(403).json({ message: '이 채팅방에 메시지를 전송할 권한이 없습니다' });
    }
    
    // 새 메시지 생성
    const message = new Message({
      roomId,
      sender: req.user.id,
      content,
      originalLanguage,
      translations,
      readBy: [req.user.id] // 보낸 사람은 이미 읽음
    });
    
    await message.save();
    
    // 채팅방의 lastMessage 업데이트
    room.lastMessage = message._id;
    await room.save();
    
    // 상세 정보 포함하여 반환
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'username profilePicture');
    
    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error('메시지 전송 에러:', error);
    res.status(500).json({ message: '서버 오류' });
  }
});

// 메시지 읽음 표시
router.put('/:messageId/read', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    
    // 메시지 존재 여부 확인
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: '메시지를 찾을 수 없습니다' });
    }
    
    // 채팅방 존재 여부 확인
    const room = await Room.findById(message.roomId);
    if (!room) {
      return res.status(404).json({ message: '채팅방을 찾을 수 없습니다' });
    }
    
    // 권한 확인 (참여자만 읽음 표시 가능)
    if (!room.participants.includes(req.user.id)) {
      return res.status(403).json({ message: '이 메시지에 읽음 표시를 할 권한이 없습니다' });
    }
    
    // 이미 읽음 표시가 되어 있는지 확인
    if (message.readBy.includes(req.user.id)) {
      return res.json(message);
    }
    
    // 읽음 표시 업데이트
    message.readBy.push(req.user.id);
    await message.save();
    
    res.json(message);
  } catch (error) {
    console.error('메시지 읽음 표시 에러:', error);
    res.status(500).json({ message: '서버 오류' });
  }
});

module.exports = router;
