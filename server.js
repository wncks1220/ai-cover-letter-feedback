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

// ✅ Node 18+ 에선 fetch 내장
if (typeof fetch !== "function") {
  global.fetch = (...args) =>
    import("node-fetch").then(({ default: f }) => f(...args));
}

// ✅ 모델 경로
const User = require(path.join(__dirname, "models", "User.js"));
const Essay = require(path.join(__dirname, "models", "Essay.js"));

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ .env 설정값
const API_KEY = process.env.OPENAI_API_KEY;
const SECRET_KEY = process.env.JWT_SECRET || "my-secret";

// ====== 미들웨어 ======
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

console.log("Loaded key:", process.env.OPENAI_API_KEY ? "✅ OK" : "❌ 없음");

// ====== MongoDB 연결 ======
const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error("❌ MONGODB_URI 환경변수가 없습니다. Render 환경 변수를 확인하세요.");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB 연결 성공"))
  .catch((err) => console.error("❌ MongoDB 연결 실패:", err));

// ====== JWT 인증 ======
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "토큰 없음" });
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: "유효하지 않은 토큰" });
  }
}

// ====== 회원가입 ======
app.post("/signup", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: "아이디와 비밀번호를 입력하세요." });

    const existingUser = await User.findOne({ username });
    if (existingUser)
      return res.status(400).json({ error: "이미 존재하는 아이디입니다." });

    const hashed = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashed, createdAt: new Date() });
    await newUser.save();
    res.json({ message: "회원가입 성공" });
  } catch (err) {
    console.error("회원가입 오류:", err);
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
    res.json({ message: "로그인 성공", token });
  } catch (err) {
    console.error("로그인 오류:", err);
    res.status(500).json({ error: "로그인 실패" });
  }
});

// ====== 자기소개서 생성 ======
app.post("/generate", authMiddleware, async (req, res) => {
  const userInput = req.body.input ?? "";
  const username = req.user.username;
  try {
    if (!API_KEY) return res.status(500).json({ error: "서버 API 키 미설정" });

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "너는 자기소개서를 도와주는 어시스턴트야." },
          { role: "user", content: userInput },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    const data = await r.json();
    const output = data?.choices?.[0]?.message?.content ?? "";

    const essay = new Essay({ userId: req.user.id, username, input: userInput, output });
    await essay.save();
    res.json({ message: output });
  } catch (err) {
    console.error("API 호출 오류:", err);
    res.status(500).json({ error: "OpenAI API 호출 실패" });
  }
});

// ====== 히스토리 조회 ======
app.get("/history", authMiddleware, async (req, res) => {
  try {
    const username = req.user.username;
    const history = await Essay.find({ username }).sort({ createdAt: -1 });
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: "히스토리 불러오기 실패" });
  }
});

// ====== 히스토리 삭제 ======
app.delete("/history/:id", authMiddleware, async (req, res) => {
  try {
    const essay = await Essay.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!essay) return res.status(404).json({ error: "삭제할 항목을 찾을 수 없습니다." });
    res.json({ message: "삭제 완료" });
  } catch (err) {
    res.status(500).json({ error: "삭제 실패" });
  }
});

// ====== 비밀번호 변경 ======
app.post("/reset-password", async (req, res) => {
  try {
    const { username, newPassword } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: "존재하지 않는 아이디" });
    const hashed = await bcrypt.hash(newPassword, 10);
    await User.updateOne({ username }, { password: hashed });
    res.json({ message: "비밀번호 변경 성공" });
  } catch (err) {
    res.status(500).json({ error: "비밀번호 변경 실패" });
  }
});

// ====================
// ====== 피드백 ======
// ====================

// ====== BERT 분석 ======
app.post("/feedback/bert", async (req, res) => {
  try {
    const { essay } = req.body;
    const userId = req.user?.id ?? null;

    const bertRes = await fetch("http://localhost:5001/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ essay }),
    });

    const bertData = await bertRes.json();

    // 결과 요약 텍스트
    const feedbackText = bertData.feedback
      .map((f, i) => `${i + 1}. ${f.sentence}\n→ ${f.comment}\n`)
      .join("\n");

    // DB 저장
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
    console.error("❌ BERT 분석 오류:", err);
    res.status(500).json({ error: "BERT 분석 중 오류 발생" });
  }
});

// ====== GPT 변환 (BERT 결과를 자연스럽게 수정) ======
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post("/feedback/gpt", async (req, res) => {
  try {
    const { essay, analysis } = req.body;

    const prompt = `
다음은 문법 분석 결과입니다.
이 피드백을 참고해 문장을 더 자연스럽고 자기소개서에 어울리게 수정해주세요.

[원본 문장]
${essay}

[문법 분석 결과]
${analysis.map((s, i) => `${i + 1}. ${s.sentence} (${s.comment}, 점수: ${s.score})`).join("\n")}

이 내용을 바탕으로 자연스럽고 논리적인 자기소개서 문단으로 다시 작성해주세요.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const rewritten = completion.choices[0].message.content;
    res.json({ rewritten });
  } catch (err) {
    console.error("❌ GPT 변환 오류:", err);
    res.status(500).json({ error: "GPT 피드백 생성 실패" });
  }
});

// ====== GPT 단순 피드백 ======
app.post("/feedback/simple", async (req, res) => {
  try {
    const { essayText } = req.body;

    if (!essayText || essayText.trim().length < 10) {
      return res.status(400).json({ error: "피드백할 자기소개서가 너무 짧습니다." });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "너는 자기소개서 전문가이자 HR면접관이다. 주어진 글을 평가하고 개선 방향을 제시해라.",
          },
          {
            role: "user",
            content: `다음 자기소개서를 피드백해줘:\n${essayText}`,
          },
        ],
      }),
    });

    const data = await response.json();
    const feedback = data.choices[0].message.content;

    res.json({ feedback });
  } catch (error) {
    console.error("❌ 단순 GPT 피드백 오류:", error);
    res.status(500).json({ error: "서버에서 피드백 생성 중 문제가 발생했습니다." });
  }
});

// ====== 서버 실행 ======
app.listen(PORT, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${PORT}`);
});

// ====== 기본 경로 리다이렉트 ======
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});




