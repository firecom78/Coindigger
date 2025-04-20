// middleware/auth.js
const jwt = require('jsonwebtoken');

// 인증 미들웨어
module.exports = function(req, res, next) {
  // 헤더에서 토큰 가져오기
  const token = req.header('x-auth-token');
  
  // 토큰이 없는 경우
  if (!token) {
    return res.status(401).json({ message: '인증 토큰이 없습니다. 로그인이 필요합니다.' });
  }
  
  try {
    // 토큰 검증
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // req 객체에 사용자 정보 추가
    req.user = decoded;
    next();
  } catch (error) {
    console.error('인증 토큰 검증 에러:', error);
    res.status(401).json({ message: '유효하지 않은 토큰입니다' });
  }
};

// .env 파일 예시
// 실제 사용시 .env 파일에 아래 내용을 저장하고 .gitignore에 .env를 추가하세요
/*
# 서버 설정
PORT=5000
NODE_ENV=development

# MongoDB 설정
MONGO_URI=mongodb://localhost:27017/multilingual-chat

# 보안
JWT_SECRET=your_jwt_secret_key_here

# 클라이언트 URL
CLIENT_URL=http://localhost:3000

# Google Cloud Translation API
GOOGLE_CLOUD_PROJECT_ID=your_google_cloud_project_id
GOOGLE_CLOUD_API_KEY=your_google_cloud_api_key
*/

// config/default.js
// config 패키지를 사용하는 경우 아래 코드를 사용할 수 있습니다
/*
module.exports = {
  port: process.env.PORT || 5000,
  mongoURI: process.env.MONGO_URI || 'mongodb://localhost:27017/multilingual-chat',
  jwtSecret: process.env.JWT_SECRET || 'dev_jwt_secret',
  clientURL: process.env.CLIENT_URL || 'http://localhost:3000',
  googleCloud: {
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    apiKey: process.env.GOOGLE_CLOUD_API_KEY
  }
};
*/

// package.json
/*
{
  "name": "multilingual-chat-backend",
  "version": "1.0.0",
  "description": "Multilingual chat application with STT and TTS support",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [
    "chat",
    "real-time",
    "socket.io",
    "translation",
    "STT",
    "TTS"
  ],
  "author": "",
  "license": "MIT",
  "dependencies": {
    "@google-cloud/translate": "^6.3.1",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^10.0.0",
    "express": "^4.17.1",
    "jsonwebtoken": "^8.5.1",
    "mongoose": "^6.0.12",
    "socket.io": "^4.3.1"
  },
  "devDependencies": {
    "nodemon": "^2.0.14"
  }
}
*/
