// ====== 상단 설정 ======
const path = require("path");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const OpenAI = require("openai");

const { Feedback } = require("./models/FB");

// Node18+ fetch
if (typeof fetch !== "function") {
  global.fetch = (...args) =>
    import("node-fetch").then(({ default: f }) => f(...args));
}

// 모델
const User = require(path.join(__dirname, "models", "User.js"));
const Essay = require(path.join(__dirname, "models", "Essay.js"));

const app = express();
const PORT = process.env.PORT || 3000;

// ====== 필수 설정값 ======
const API_KEY = process.env.OPENAI_API_KEY;
const SECRET_KEY = process.env.JWT_SECRET || "my-secret";
const BERT_URL = process.env.BERT_SERVER_URL; 
// ⚠ Railway에서 나중에 Variables에 BERT_SERVER_URL 추가

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

console.log("Loaded OpenAI Key:", API_KEY ? "OK" : "MISSING");
console.log("Loaded BERT URL:", BERT_URL || "NOT SET");

// ====== MongoDB 연결 ======
const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error("❌ MONGODB_URI 없음");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB 연결 성공"))
  .catch((err) => console.error("❌ MongoDB 실패:", err));

// ====== JWT 인증 ======
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "토큰 없음" });
  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch {
    return res.status(403).json({ error: "유효하지 않은 토큰" });
  }
}

// ====== 회원가입 ======
app.post("/signup", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password)
      return res.status(400).json({ error: "아이디/비밀번호 필요" });

    const exists = await User.findOne({ username });
    if (exists)
      return res.status(400).json({ error: "이미 존재하는 아이디" });

    const hashed = await bcrypt.hash(password, 10);
    const newUser = new User({
      username,
      password: hashed,
      createdAt: new Date(),
    });

    await newUser.save();
    res.json({ message: "회원가입 성공" });
  } catch (err) {
    res.status(500).json({ error: "서버 오류" });
  }
});

// ====== 로그인 ======
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: "아이디 없음" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "비밀번호 오류" });

    const token = jwt.sign(
      { id: user._id, username: user.username },
      SECRET_KEY,
      { expiresIn: "2h" }
    );

    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: "로그인 실패" });
  }
});

// ====== BERT 분석 ======
app.post("/feedback/bert", async (req, res) => {
  try {
    const { essay } = req.body;
    const userId = req.user?.id ?? null;

    if (!BERT_URL)
      return res.status(500).json({ error: "BERT 서버 URL 미설정" });

    const bertRes = await fetch(`${BERT_URL}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ essay }),
    });

    const bertData = await bertRes.json();

    const feedbackText = bertData.feedback
      .map((f, i) => `${i + 1}. ${f.sentence}\n→ ${f.comment}`)
      .join("\n");

    if (userId) {
      await Feedback.create({
        userId,
        feedback: feedbackText,
        preview: essay.slice(0, 20),
        date: new Date(),
      });
    }

    res.json(bertData);
  } catch (err) {
    res.status(500).json({ error: "BERT 분석 실패" });
  }
});

// ====== GPT 재작성 ======
const openai = new OpenAI({ apiKey: API_KEY });

app.post("/feedback/gpt", async (req, res) => {
  try {
    const { essay, analysis } = req.body;

    const prompt = `
다음은 문법 분석 결과입니다.
이 피드백을 참고해 문장을 더 자연스럽게 수정해주세요.

원본:
${essay}

분석:
${analysis.map((s, i) => `${i + 1}. ${s.sentence} (${s.comment})`).join("\n")}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    res.json({ rewritten: completion.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ error: "GPT 오류" });
  }
});

// ====== 서버 실행 ======
app.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: 포트=${PORT}`);
});

// ====== 기본 HTML ======
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});




