// 회원가입
async function signup() {
  const username = document.getElementById('newUsername').value.trim();
  const password = document.getElementById('newPassword').value.trim();

  if (!username || !password) {
    alert("아이디와 비밀번호를 입력하세요.");
    return;
  }

  try {
    const response = await fetch("http://localhost:3000/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (response.ok) {
      alert("회원가입 완료! 로그인 해주세요.");
      window.location.href = "../login.html";
    } else {
      alert(data.message || "회원가입 실패");
    }
  } catch (error) {
    console.error("회원가입 오류:", error);
    alert("서버 연결 실패");
  }
}

// 로그인
async function login() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!username || !password) {
    alert("아이디와 비밀번호를 입력하세요.");
    return;
  }

  try {
    const response = await fetch("http://localhost:3000/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (response.ok) {
      alert("로그인 성공!");
      localStorage.setItem("token", data.token); // JWT 토큰 저장
      window.location.href = "create.html";
    } else {
      alert(data.message || "로그인 실패");
    }
  } catch (error) {
    console.error("로그인 오류:", error);
    alert("서버 연결 실패");
  }
}

// 비밀번호 찾기
async function findPassword() {
  const username = document.getElementById('findUsername').value.trim();
  if (!username) {
    alert("아이디를 입력하세요.");
    return;
  }

  try {
    const response = await fetch("http://localhost:3000/find-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username })
    });

    const data = await response.json();

    if (response.ok) {
      document.getElementById('result').innerText = `비밀번호: ${data.password}`;
    } else {
      document.getElementById('result').innerText = data.message || "찾기 실패";
    }
  } catch (error) {
    console.error("비밀번호 찾기 오류:", error);
    document.getElementById('result').innerText = "서버 연결 실패";
  }
}
