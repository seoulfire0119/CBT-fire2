// 로그인/회원가입 처리 스크립트

let isLoginMode = true;

const authDom = {
  authTitle: document.getElementById("authTitle"),
  authForm: document.getElementById("authForm"),
  nameField: document.getElementById("name"),
  stationField: document.getElementById("station"),
  departmentField: document.getElementById("department"),
  stationGroup: document.getElementById("stationGroup"),
  departmentGroup: document.getElementById("departmentGroup"),
  emailField: document.getElementById("email"),
  passwordField: document.getElementById("password"),
  authButton: document.getElementById("authButton"),
  toggleText: document.getElementById("toggleText"),
  toggleLink: document.getElementById("toggleLink"),
  errorMessage: document.getElementById("errorMessage"),
  userInfo: document.getElementById("userInfo"),
  userEmail: document.getElementById("userEmail"),
  logoutButton: document.getElementById("logoutButton"),
  privacyGroup: document.getElementById("privacyGroup"),
  privacyConsent: document.getElementById("privacyConsent")
};

// 소방서 드롭박스 초기화
function initializeStationDropdown() {
  authDom.stationField.innerHTML = '<option value="">소방서를 선택하세요</option>';
  STATION_NAMES.forEach(station => {
    const option = document.createElement("option");
    option.value = station;
    option.textContent = station;
    authDom.stationField.appendChild(option);
  });
}

// 소속 선택 시 부서 드롭박스 업데이트
authDom.stationField.addEventListener("change", () => {
  const selectedStation = authDom.stationField.value;

  if (!selectedStation) {
    authDom.departmentField.disabled = true;
    authDom.departmentField.innerHTML = '<option value="">먼저 소속을 선택하세요</option>';
    return;
  }

  const departments = FIRE_STATIONS[selectedStation];
  authDom.departmentField.innerHTML = '<option value="">안전센터를 선택하세요</option>';

  departments.forEach(dept => {
    const option = document.createElement("option");
    option.value = dept;
    option.textContent = dept;
    authDom.departmentField.appendChild(option);
  });

  authDom.departmentField.disabled = false;
});

// 페이지 로드 시 드롭박스 초기화
initializeStationDropdown();

// 초기 상태: 이름, 소속, 부서 필드 숨기기 (로그인 모드)
authDom.nameField.parentElement.style.display = "none";
authDom.stationGroup.style.display = "none";
authDom.departmentGroup.style.display = "none";

// 로그인/회원가입 모드 전환
authDom.toggleLink.addEventListener("click", (e) => {
  e.preventDefault();
  isLoginMode = !isLoginMode;

  if (isLoginMode) {
    authDom.authTitle.textContent = "로그인";
    authDom.authButton.textContent = "로그인";
    authDom.toggleText.textContent = "계정이 없으신가요?";
    authDom.toggleLink.textContent = "회원가입";
    authDom.nameField.parentElement.style.display = "none";
    authDom.stationGroup.style.display = "none";
    authDom.departmentGroup.style.display = "none";
    authDom.privacyGroup.style.display = "none";
    authDom.privacyConsent.checked = false;
    authDom.nameField.required = false;
    authDom.stationField.required = false;
    authDom.departmentField.required = false;
  } else {
    authDom.authTitle.textContent = "회원가입";
    authDom.authButton.textContent = "회원가입";
    authDom.toggleText.textContent = "이미 계정이 있으신가요?";
    authDom.toggleLink.textContent = "로그인";
    authDom.nameField.parentElement.style.display = "block";
    authDom.stationGroup.style.display = "block";
    authDom.departmentGroup.style.display = "block";
    authDom.privacyGroup.style.display = "flex";
    authDom.nameField.required = true;
    authDom.stationField.required = true;
    authDom.departmentField.required = true;
  }

  authDom.errorMessage.style.display = "none";
});

// 에러 메시지 표시
function showError(message) {
  authDom.errorMessage.textContent = message;
  authDom.errorMessage.style.display = "block";
}

// 로그인/회원가입 처리
authDom.authForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = authDom.emailField.value.trim();
  const password = authDom.passwordField.value;
  const name = authDom.nameField.value.trim();
  const station = authDom.stationField.value;
  const department = authDom.departmentField.value;

  if (!email || !password) {
    showError("이메일과 비밀번호를 입력해주세요.");
    return;
  }

  if (!isLoginMode) {
    if (!name) {
      showError("이름을 입력해주세요.");
      return;
    }
    if (!station) {
      showError("소속(소방서)을 선택해주세요.");
      return;
    }
    if (!department) {
      showError("부서(안전센터)를 선택해주세요.");
      return;
    }
    if (!authDom.privacyConsent.checked) {
      showError("개인정보 수집 및 이용에 동의해주세요.");
      return;
    }
  }

  authDom.errorMessage.style.display = "none";
  authDom.authButton.disabled = true;

  try {
    if (isLoginMode) {
      // 로그인
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      console.log("로그인 성공:", userCredential.user);

      // 이전 시험 상태 초기화
      localStorage.removeItem("cbt_state_v1");

      // index.html로 리다이렉트
      window.location.href = "index.html";
    } else {
      // 회원가입
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);

      // Firestore에 사용자 정보 저장
      await db.collection("users").doc(userCredential.user.uid).set({
        name: name,
        email: email,
        station: station,
        department: department,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      console.log("회원가입 성공:", userCredential.user);
      alert("회원가입이 완료되었습니다!");

      // 로그인 모드로 전환
      isLoginMode = true;
      authDom.toggleLink.click();
    }
  } catch (error) {
    console.error("인증 오류:", error);

    let errorMsg = "오류가 발생했습니다.";

    switch (error.code) {
      case "auth/email-already-in-use":
        errorMsg = "이미 사용 중인 이메일입니다.";
        break;
      case "auth/invalid-email":
        errorMsg = "유효하지 않은 이메일 형식입니다.";
        break;
      case "auth/weak-password":
        errorMsg = "비밀번호는 6자 이상이어야 합니다.";
        break;
      case "auth/user-not-found":
        errorMsg = "등록되지 않은 사용자입니다. 먼저 회원가입을 해주세요.";
        break;
      case "auth/wrong-password":
        errorMsg = "비밀번호가 올바르지 않습니다.";
        break;
      case "auth/invalid-login-credentials":
        errorMsg = "이메일 또는 비밀번호가 올바르지 않습니다. 회원가입을 먼저 하셨나요?";
        break;
      case "auth/too-many-requests":
        errorMsg = "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.";
        break;
      default:
        errorMsg = `오류: ${error.code || error.message}`;
    }

    showError(errorMsg);
  } finally {
    authDom.authButton.disabled = false;
  }
});

// 로그아웃
authDom.logoutButton.addEventListener("click", async () => {
  try {
    await auth.signOut();
    console.log("로그아웃 성공");
    window.location.reload();
  } catch (error) {
    console.error("로그아웃 오류:", error);
    alert("로그아웃 중 오류가 발생했습니다.");
  }
});

// 로그인 상태 확인
auth.onAuthStateChanged((user) => {
  if (user) {
    // 로그인된 상태
    authDom.authForm.parentElement.querySelector("h2").style.display = "none";
    authDom.authForm.style.display = "none";
    authDom.authForm.parentElement.querySelector(".auth-toggle").style.display = "none";
    authDom.userInfo.style.display = "block";
    authDom.userEmail.textContent = user.email;
  } else {
    // 로그아웃된 상태
    authDom.authForm.parentElement.querySelector("h2").style.display = "block";
    authDom.authForm.style.display = "flex";
    authDom.authForm.parentElement.querySelector(".auth-toggle").style.display = "block";
    authDom.userInfo.style.display = "none";
  }
});
