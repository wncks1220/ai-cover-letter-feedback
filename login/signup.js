async function signup() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  const confirmPassword = document.getElementById('confirmPassword').value.trim();

  if (!username || !password || !confirmPassword) {
    alert("모든 항목을 입력하세요.");
    return;
  }

  if (password !== confirmPassword) {
    alert("비밀번호가 일치하지 않습니다.");
    return;
  }

  try {
    const res = await fetch("signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (res.ok) {
      alert("회원가입 성공! 로그인 페이지로 이동합니다.");
      window.location.href = "../login/login.html";
    } else {
      alert(data.error || "회원가입 실패");
    }
  } catch (err) {
    console.error(err);
    alert("서버 연결 실패");
  }
}

