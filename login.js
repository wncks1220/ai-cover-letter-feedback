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
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (response.ok) {
      alert("로그인 성공!");
      // JWT 토큰 저장 (ex: localStorage)
      localStorage.setItem("token", data.token);
      window.location.href = "Select/select.html"; // 로그인 후 이동할 페이지
    } else {
      alert(data.message || "로그인 실패");
    }
  } catch (error) {
    console.error("로그인 오류:", error);
    alert("서버와 연결할 수 없습니다.");
  }
}