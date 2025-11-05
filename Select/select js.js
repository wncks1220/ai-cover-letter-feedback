// 로그아웃 버튼 클릭 시
document.getElementById('accountBtn').onclick = async function () {
  // 로컬스토리지에 JWT 토큰이 있다면 삭제
  localStorage.removeItem('token');

  // 서버 로그아웃 API 호출 (선택 사항)
  try {
    await fetch('http://localhost:3000/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });
  } catch (e) {
    console.warn('서버 로그아웃 실패:', e);
  }

  alert('로그아웃 되었습니다.');
  location.href = '../login.html'; // 로그인 화면으로 이동
};

// 자기소개서 생성 페이지
document.getElementById('createBtn').onclick = function () {
  location.href = '../create/create.html';
};

// 자기소개서 피드백 페이지
document.getElementById('feedbackBtn').onclick = function () {
  location.href = '../feedback/feedback.html'; // 실제 피드백 페이지 경로로 변경
};