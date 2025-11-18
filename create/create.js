// ====== 자기소개서 생성 ======
async function generateEssay() {
  const userInput = document.getElementById('userInput').value.trim();
  const token = localStorage.getItem('token'); // ✅ 로그인 시 저장된 JWT 토큰

  if (!token) {
    alert("로그인이 필요합니다.");
    window.location.href = "../login.html";
    return;
  }

  if (!userInput) {
    alert("내용을 입력하세요.");
    return;
  }

  try {
    const response = await fetch("https://ai-cover-letter-feedback-production.up.railway.app/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}` // ✅ 토큰 포함
      },
      body: JSON.stringify({ input: userInput }) // username 보낼 필요 없음
    });

    const data = await response.json();

    if (response.ok && data.message) {
      const newOutput = document.createElement("div");
      newOutput.className = "output";
      newOutput.textContent = data.message;
      const container = document.getElementById("outputContainer");
      container.prepend(newOutput);
      document.getElementById("userInput").value = "";
      updateCharCount();
    } else {
      alert(data.error || data.message || "응답에 문제가 발생했습니다.");
    }
  } catch (error) {
    console.error("Error:", error);
    alert("서버와의 연결에서 오류가 발생했습니다.");
  }
}

// ====== 글자수 표시 ======
function updateCharCount() {
  const charCount = document.getElementById('userInput').value.length;
  document.getElementById('charCount').textContent = `${charCount}자`;
}

// ====== 페이지 이동 ======
function goToSelect() {
  window.location.href = '../Select/select.html';
}

// ====== 계정 드롭다운 ======
function toggleAccount() {
  const dropdown = document.getElementById("accountDropdown");
  dropdown.classList.toggle("show");
}

// ====== 로그아웃 ======
function logout() {
  localStorage.removeItem("token"); //  currentUser 대신 token 제거
  alert("로그아웃 완료");
  window.location.href = "../login.html";
}

// ====== 외부 클릭 시 닫기 ======
window.addEventListener("click", function(event) {
  if (!event.target.matches('.account-btn')) {
    const dropdown = document.getElementById("accountDropdown");
    if (dropdown && dropdown.classList.contains("show")) {
      dropdown.classList.remove("show");
    }
  }
});

// ===== 로그인된 사용자 표시 =====
function displayCurrentUser() {
  const token = localStorage.getItem("token");
  const userElement = document.getElementById("currentUser");

  if (!token) {
    userElement.textContent = "로그인 정보 없음";
    return;
  }

  try {
    // JWT는 3부분으로 나뉨: header.payload.signature
    const base64Payload = token.split('.')[1];
    const payload = JSON.parse(atob(base64Payload));

    const username = payload.username || "(알 수 없음)";
    userElement.textContent = `👤 로그인 중: ${username}`;
  } catch (e) {
    console.error("JWT 디코드 오류:", e);
    userElement.textContent = "로그인 정보 오류";
  }
}

window.addEventListener("DOMContentLoaded", displayCurrentUser);
