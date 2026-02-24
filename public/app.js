// Basic CBT app (single-choice).
// Loads questions from fire-sample.json, auto-saves to localStorage, grades automatically.

const STATE_KEY = "cbt_state_v1";

let questions = [];
let currentIndex = 0;
let answers = {}; // { [id]: selectedIndex }
let timeLeft = 0; // seconds
let timerId = null;
let started = false;
let currentUser = null; // 현재 로그인한 사용자
let currentUserProfile = null; // { name, station, department }

// Firestore 읽기 최적화용 캐시
let _examCountCache = { count: null, timestamp: 0 };
let _notificationCache = { data: null, timestamp: 0 };

const dom = {
  jobSelect: document.getElementById("jobSelect"),
  startBtn: document.getElementById("startBtn"),
  timer: document.getElementById("timer"),
  examScreen: document.getElementById("examScreen"),
  resultScreen: document.getElementById("resultScreen"),
  questionArea: document.getElementById("questionArea"),
  questionList: document.getElementById("questionList"),
  prevBtn: document.getElementById("prevBtn"),
  nextBtn: document.getElementById("nextBtn"),
  submitBtn: document.getElementById("submitBtn"),
  scoreLine: document.getElementById("scoreLine"),
  reviewArea: document.getElementById("reviewArea"),
  currentUserSpan: document.getElementById("currentUser"),
  logoutBtn: document.getElementById("logoutBtn"),
  adminLink: document.getElementById("adminLink"),
  examCountDisplay: document.getElementById("examCountDisplay"),
  examCountText: document.getElementById("examCountText"),
  notificationSection: document.getElementById("notificationSection"),
  notificationList: document.getElementById("notificationList"),
  notificationToggle: document.getElementById("notificationToggle"),
  notificationArrow: document.getElementById("notificationArrow"),
  // 결과 모달
  resultModal: document.getElementById("resultModal"),
  modalUserName: document.getElementById("modalUserName"),
  modalJobName: document.getElementById("modalJobName"),
  modalScore: document.getElementById("modalScore"),
  modalSubjectDetail: document.getElementById("modalSubjectDetail"),
  modalCloseBtn: document.getElementById("modalCloseBtn"),
  // 과목별 상세보기 모달
  subjectDetailModal: document.getElementById("subjectDetailModal"),
  subjectDetailTitle: document.getElementById("subjectDetailTitle"),
  subjectSummary: document.getElementById("subjectSummary"),
  questionDetailList: document.getElementById("questionDetailList"),
  subjectDetailCloseBtn: document.getElementById("subjectDetailCloseBtn"),
  subjectDetailBackBtn: document.getElementById("subjectDetailBackBtn"),
};

// 과목별 상세 데이터 저장용
let subjectReviewData = {};

// DOM 요소 확인
console.log("DOM elements:", {
  jobSelect: dom.jobSelect,
  startBtn: dom.startBtn
});

// 직무별 문제 구성
const JOB_CONFIGS = {
  commander: [
    { file: 'data/safety.json', count: 10 },    // 안전관리 10문제
    { file: 'data/facility.json', count: 10 }   // 소방시설분야 10문제
  ],
  firefighter: [
    { file: 'data/fire.json', count: 10 },      // 화재분야 10문제
    { file: 'data/facility.json', count: 5 },   // 소방시설분야 5문제
    { file: 'data/safety.json', count: 5 }      // 안전관리 5문제
  ],
  rescuer: [
    { file: 'data/rescue.json', count: 10 },    // 구조분야 10문제
    { file: 'data/facility.json', count: 5 },   // 소방시설분야 5문제
    { file: 'data/safety.json', count: 5 }      // 안전관리 5문제
  ],
  paramedic_qualified: [
    { file: 'data/emergency_qualified.json', count: 15 }, // 구급(자격자) Q-0001~Q-0046 중 15문제
    { file: 'data/safety.json', count: 5 }                // 안전관리 5문제
  ],
  paramedic_trained: [
    { file: 'data/emergency_trained.json', count: 15 },   // 구급(교육이수자) Q-0047~Q-0070 중 15문제
    { file: 'data/safety.json', count: 5 }                // 안전관리 5문제
  ],
  mobile: [
    { file: 'data/equipment.json', count: 10 }, // 장비분야 10문제
    { file: 'data/safety.json', count: 10 }     // 안전관리 10문제
  ]
};

// Restore from localStorage (if any)
function restoreState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);

    // 현재 로그인한 사용자와 저장된 사용자가 다르면 상태 무시
    if (currentUser && s.userId && s.userId !== currentUser.uid) {
      console.log("Different user detected, clearing saved state");
      localStorage.removeItem(STATE_KEY);
      return;
    }

    if (s && s.questions && s.answers) {
      questions = s.questions;
      answers = s.answers || {};
      timeLeft = s.timeLeft ?? 0;
      started = s.started ?? false;
    }
  } catch (e) {
    console.warn("restoreState failed", e);
  }
}
function saveState() {
  try {
    localStorage.setItem(
      STATE_KEY,
      JSON.stringify({
        userId: currentUser ? currentUser.uid : null,
        questions,
        answers,
        timeLeft,
        started
      })
    );
  } catch (e) {
    console.warn("saveState failed", e);
  }
}

// 문제 단수 선택 함수
function getRandomQuestions(allQuestions, count) {
  const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// 힌트 모드에서 선택한 답이 정답인지 확인
function checkAnswerCorrect(question, selectedIndex) {
  if (!question || selectedIndex === undefined) return false;
  
  const correctAnswerIndex = Array.isArray(question.answer) ? question.answer[0] - 1 : question.answer - 1;
  return selectedIndex === correctAnswerIndex;
}

async function loadQuestionsByJob(jobType) {
  const config = JOB_CONFIGS[jobType];
  if (!config) {
    throw new Error("잘못된 직무 선택: " + jobType);
  }
  
  questions = [];
  
  for (const { file, count } of config) {
    const res = await fetch(file);
    if (!res.ok) throw new Error("문항 로드 실패: " + file);
    const data = await res.json();
    
    // 각 출처에서 랜덤으로 문제 선택
    const selectedQuestions = getRandomQuestions(data, count);
    questions.push(...selectedQuestions);
  }
  
  // 전체 문제 순서 다시 섞기
  questions = questions.sort(() => Math.random() - 0.5);
  
  // 문제들에 고유 인덱스 추가 (ID 충돌 방지)
  questions.forEach((q, index) => {
    q.uniqueIndex = index;
    console.log(`문제 ${index + 1}: ID=${q.id}, UniqueIndex=${q.uniqueIndex}`);
  });
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function startTimer() {
  if (timerId) clearInterval(timerId);
  timerId = setInterval(() => {
    if (timeLeft <= 0) {
      clearInterval(timerId);
      dom.timer.textContent = "시간 종료";
      submitExam();
      return;
    }
    timeLeft -= 1;
    dom.timer.textContent = `남은 시간: ${formatTime(timeLeft)}`;
    saveState();
  }, 1000);
}

function renderQuestionList(reviewMode = false, reviewData = null) {
  dom.questionList.innerHTML = "";
  questions.forEach((q, idx) => {
    const btn = document.createElement("button");
    let className = "qbtn";
    
    if (idx === currentIndex) className += " active";
    if (answers[q.uniqueIndex] != null) className += " answered";
    
    // 리뷰 모드에서 오답 표시
    if (reviewMode && reviewData) {
      const reviewItem = reviewData.find(r => r.q.id === q.id);
      if (reviewItem && !reviewItem.isCorrect) {
        className += " review-wrong";
      }
    }
    
    btn.className = className;
    btn.textContent = String(idx + 1);
    btn.addEventListener("click", () => {
      currentIndex = idx;
      render(reviewMode, reviewData);
    });
    dom.questionList.appendChild(btn);
  });
}

function renderQuestion(reviewMode = false, reviewData = null) {
  const q = questions[currentIndex];
  const container = document.createElement("div");
  const title = document.createElement("h2");
  title.textContent = `문항 ${currentIndex + 1}. ${q.stem}`;

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = `${q.subject} · 유형: ${q.type}`;

  container.appendChild(title);
  container.appendChild(meta);

  const group = document.createElement("div");
  
  // 리뷰 모드에서 정답 정보 가져오기
  let reviewItem = null;
  if (reviewMode && reviewData) {
    reviewItem = reviewData.find(r => r.q.id === q.id);
  }

  q.choices.forEach((choice, idx) => {
    const id = `q${currentIndex}_${q.id}_c${idx}`;
    const label = document.createElement("label");
    label.className = "choice";

    const input = document.createElement("input");
    input.type = "radio";
    input.name = `q_${currentIndex}_${q.id}`;
    input.id = id;
    input.checked = answers[q.uniqueIndex] === idx;

    input.addEventListener("change", () => {
      if (input.checked) {
        console.log(`문제 ${currentIndex + 1} (ID: ${q.id}): ${idx + 1}번 선택됨`);
        answers[q.uniqueIndex] = idx;
        saveState();
        // Update list badge
        renderQuestionList();
      }
    });
    
    const text = document.createElement("span");
    text.textContent = choice;
    label.appendChild(input);
    label.appendChild(text);
    group.appendChild(label);
  });

  container.appendChild(group);
  
  // 리뷰 모드에서 해설 표시
  if (reviewMode && reviewItem) {
    const explanation = document.createElement("div");
    explanation.className = "explanation-box";
    
    const resultText = document.createElement("div");
    resultText.className = reviewItem.isCorrect ? "result-correct" : "result-wrong";
    resultText.textContent = reviewItem.isCorrect ? "✓ 정답입니다" : "✗ 오답입니다";
    explanation.appendChild(resultText);
    
    if (q.explanation) {
      const explainText = document.createElement("div");
      explainText.className = "explain";
      explainText.innerHTML = `<strong>해설:</strong> ${q.explanation}`;
      explanation.appendChild(explainText);
    }
    
    if (q.reference) {
      const refText = document.createElement("div");
      refText.className = "reference";
      refText.innerHTML = `<strong>근거/출처:</strong> ${q.reference}`;
      explanation.appendChild(refText);
    }
    
    container.appendChild(explanation);
  }
  
  // 기존 내용을 완전히 제거하고 새로 추가
  while (dom.questionArea.firstChild) {
    dom.questionArea.removeChild(dom.questionArea.firstChild);
  }
  dom.questionArea.appendChild(container);
}

function render(reviewMode = false, reviewData = null) {
  renderQuestionList(reviewMode, reviewData);
  renderQuestion(reviewMode, reviewData);
  dom.prevBtn.disabled = currentIndex === 0;
  dom.nextBtn.disabled = currentIndex === questions.length - 1;
}

async function submitExam() {
  // Grade
  let correct = 0;
  const review = [];

  // 과목별 통계 계산
  const subjectStats = {};
  const subjectOrder = ["구급", "장비", "소방시설", "화재", "구조", "안전관리"];

  // 과목별 상세 데이터 초기화
  subjectReviewData = {};

  questions.forEach((q, qIndex) => {
    const selected = answers[q.uniqueIndex];
    // answer는 1-based 배열 [1,2,3,4], selected는 0-based 인덱스 [0,1,2,3]
    let isCorrect = false;
    const correctAnswer = Array.isArray(q.answer) ? q.answer[0] : q.answer;
    if (selected != null) {
      isCorrect = (selected + 1) === correctAnswer;
      if (isCorrect) correct += 1;
    }
    review.push({ q, selected, isCorrect });

    // 과목별 통계 누적
    const subject = q.subject || "기타";
    if (!subjectStats[subject]) {
      subjectStats[subject] = { total: 0, correct: 0, questions: [] };
    }
    subjectStats[subject].total += 1;
    if (isCorrect) subjectStats[subject].correct += 1;

    // 과목별 문제 상세 데이터 저장
    subjectStats[subject].questions.push({
      questionNumber: qIndex + 1,
      stem: q.stem,
      choices: q.choices,
      selected: selected,
      correctAnswer: correctAnswer,
      isCorrect: isCorrect
    });
  });

  // 과목별 상세 데이터 전역 저장
  subjectReviewData = subjectStats;

  const total = questions.length;
  const score = Math.round((correct/total)*100);
  dom.scoreLine.textContent = `총점: ${correct} / ${total} (${score}점)`;

  const selectedJob = dom.jobSelect.value;
  const jobNames = {
    commander: "지휘대",
    firefighter: "진압대원",
    rescuer: "구조대원",
    paramedic_qualified: "구급대원(자격자)",
    paramedic_trained: "구급대원(교육이수자)",
    mobile: "기동대원"
  };

  // Firestore에 결과 저장
  if (currentUser && db) {
    try {
      await db.collection("exam_results").add({
        userId: currentUser.uid,
        userEmail: currentUser.email,
        // 유저 정보를 함께 저장 → 관리자 페이지에서 users 컬렉션 읽기 불필요
        userName: currentUserProfile ? currentUserProfile.name : currentUser.email,
        userStation: currentUserProfile ? currentUserProfile.station : "",
        userDepartment: currentUserProfile ? currentUserProfile.department : "",
        jobType: selectedJob,
        jobName: jobNames[selectedJob] || selectedJob,
        score: score,
        correct: correct,
        total: total,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        timeTaken: (20 * 60) - timeLeft // 소요 시간 (초)
      });

      console.log("시험 결과가 저장되었습니다.");
      _examCountCache.count = null; // 캐시 무효화 후 갱신
      updateExamCountUI();
    } catch (error) {
      console.error("결과 저장 실패:", error);
    }
  }

  // 모달에 결과 표시
  dom.modalUserName.textContent = currentUser ? currentUser.email : "게스트";
  dom.modalJobName.textContent = jobNames[selectedJob] || selectedJob;
  dom.modalScore.textContent = `${correct} / ${total} (${score}점)`;

  // 과목별 상세내역 테이블 생성
  dom.modalSubjectDetail.innerHTML = "";
  subjectOrder.forEach(subject => {
    if (subjectStats[subject]) {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${subject}</td>
        <td>${subjectStats[subject].total}문제</td>
        <td>${subjectStats[subject].correct}개</td>
        <td><button class="detail-btn" data-subject="${subject}">상세보기</button></td>
      `;
      dom.modalSubjectDetail.appendChild(row);
    }
  });

  // 기타 과목 (정의되지 않은 과목)
  Object.keys(subjectStats).forEach(subject => {
    if (!subjectOrder.includes(subject)) {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${subject}</td>
        <td>${subjectStats[subject].total}문제</td>
        <td>${subjectStats[subject].correct}개</td>
        <td><button class="detail-btn" data-subject="${subject}">상세보기</button></td>
      `;
      dom.modalSubjectDetail.appendChild(row);
    }
  });

  // 상세보기 버튼 이벤트 리스너 등록
  document.querySelectorAll(".detail-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const subject = e.target.getAttribute("data-subject");
      showSubjectDetail(subject);
    });
  });

  // 모달 표시
  dom.resultModal.classList.remove("hidden");

  // Clear running timer & state
  if (timerId) clearInterval(timerId);
  started = false;

  // 시험 제출 완료 후 localStorage 완전히 삭제하여 재응시 방지
  localStorage.removeItem(STATE_KEY);

  // 변수 초기화 (모달 닫은 후 초기화하도록 변경)
  questions = [];
  answers = {};
  currentIndex = 0;
  timeLeft = 0;
}

function restart() {
  answers = {};
  started = false;
  timeLeft = 0;
  questions = [];
  currentIndex = 0;
  saveState();
  dom.resultScreen.classList.add("hidden");
  dom.examScreen.classList.add("hidden");
  dom.jobSelect.disabled = false;
  dom.startBtn.disabled = !dom.jobSelect.value;
  dom.timer.textContent = "";

  // 제출 버튼 다시 표시
  dom.submitBtn.style.display = "block";

  // 이벤트 리스너 재설정
  dom.prevBtn.replaceWith(dom.prevBtn.cloneNode(true));
  dom.nextBtn.replaceWith(dom.nextBtn.cloneNode(true));

  const newPrevBtn = document.getElementById("prevBtn");
  const newNextBtn = document.getElementById("nextBtn");

  newPrevBtn.addEventListener("click", () => {
    if (currentIndex > 0) { currentIndex -= 1; render(); }
  });
  newNextBtn.addEventListener("click", () => {
    if (currentIndex < questions.length - 1) { currentIndex += 1; render(); }
  });

  // DOM 참조 업데이트
  dom.prevBtn = newPrevBtn;
  dom.nextBtn = newNextBtn;
}

dom.prevBtn.addEventListener("click", () => {
  if (currentIndex > 0) { currentIndex -= 1; render(); }
});
dom.nextBtn.addEventListener("click", () => {
  if (currentIndex < questions.length - 1) { currentIndex += 1; render(); }
});
dom.submitBtn.addEventListener("click", () => {
  // 미응답 문항 확인
  const unansweredQuestions = [];
  questions.forEach((q, idx) => {
    if (answers[q.uniqueIndex] == null) {
      unansweredQuestions.push(idx + 1);
    }
  });

  // 미응답 문항이 있으면 경고
  if (unansweredQuestions.length > 0) {
    const unansweredList = unansweredQuestions.join(", ");
    const continueSubmit = confirm(`다음 문항에 답하지 않았습니다:\n문항 번호: ${unansweredList}\n\n그래도 제출하시겠습니까?`);
    if (!continueSubmit) {
      return; // 취소 시 제출 중단
    }
  }

  // 제출 확인 경고
  const confirmSubmit = confirm("제출하기를 누르면 결과가 전송됩니다.\n제출하시겠습니까?");
  if (confirmSubmit) {
    submitExam();
  }
});

// Job selection handler
dom.jobSelect.addEventListener("change", () => {
  const selected = dom.jobSelect.value;
  console.log("Job selected:", selected);
  dom.startBtn.disabled = !selected;
  if (selected) {
    questions = []; // Clear previous questions
  }
});

// 결과 모달 닫기 버튼
dom.modalCloseBtn.addEventListener("click", () => {
  dom.resultModal.classList.add("hidden");
  dom.examScreen.classList.add("hidden");
  // 시작 화면으로 돌아가기
  dom.startBtn.disabled = false;
  dom.jobSelect.disabled = false;
  dom.jobSelect.value = "";
  dom.startBtn.disabled = true;
});

// 과목별 상세보기 함수
function showSubjectDetail(subject) {
  const data = subjectReviewData[subject];
  if (!data) return;

  // 모달 제목 설정
  dom.subjectDetailTitle.textContent = `${subject} 상세보기`;

  // 요약 통계 표시
  const wrongCount = data.total - data.correct;
  dom.subjectSummary.innerHTML = `
    <div style="font-weight: 600; font-size: 1.1rem; margin-bottom: 0.5rem;">${subject}</div>
    <div class="summary-stats">
      <div class="stat-item">
        <div class="stat-value">${data.total}</div>
        <div class="stat-label">총 문제</div>
      </div>
      <div class="stat-item">
        <div class="stat-value stat-correct">${data.correct}</div>
        <div class="stat-label">정답</div>
      </div>
      <div class="stat-item">
        <div class="stat-value stat-wrong">${wrongCount}</div>
        <div class="stat-label">오답</div>
      </div>
    </div>
  `;

  // 문제 목록 표시
  dom.questionDetailList.innerHTML = "";
  data.questions.forEach(q => {
    const itemDiv = document.createElement("div");
    itemDiv.className = `question-detail-item ${q.isCorrect ? 'correct' : 'wrong'}`;

    const yourAnswerText = q.selected != null ? `${q.selected + 1}번: ${q.choices[q.selected]}` : "미응답";
    const correctAnswerText = `${q.correctAnswer}번: ${q.choices[q.correctAnswer - 1]}`;

    itemDiv.innerHTML = `
      <div class="q-header">
        <span class="q-number">문제 ${q.questionNumber}</span>
        <span class="q-result ${q.isCorrect ? 'correct' : 'wrong'}">${q.isCorrect ? '정답' : '오답'}</span>
      </div>
      <div class="q-stem">${q.stem}</div>
      <div class="q-answer-info">
        <div class="your-answer"><strong>내 답안:</strong> ${yourAnswerText}</div>
        ${!q.isCorrect ? `<div class="correct-answer"><strong>정답:</strong> ${correctAnswerText}</div>` : ''}
      </div>
    `;
    dom.questionDetailList.appendChild(itemDiv);
  });

  // 결과 모달 숨기고 상세보기 모달 표시
  dom.resultModal.classList.add("hidden");
  dom.subjectDetailModal.classList.remove("hidden");
}

// 상세보기 모달 닫기 버튼
if (dom.subjectDetailCloseBtn) {
  dom.subjectDetailCloseBtn.addEventListener("click", () => {
    dom.subjectDetailModal.classList.add("hidden");
    dom.resultModal.classList.remove("hidden");
  });
}

// 상세보기 모달 돌아가기 버튼
if (dom.subjectDetailBackBtn) {
  dom.subjectDetailBackBtn.addEventListener("click", () => {
    dom.subjectDetailModal.classList.add("hidden");
    dom.resultModal.classList.remove("hidden");
  });
}

// 오늘 시험 응시 횟수 확인 (캐시 + 서버 필터 적용)
async function getTodayExamCount(forceRefresh = false) {
  if (!currentUser || !db) return 0;

  // 캐시가 유효하면 (60초 이내) 캐시된 값 반환
  const now = Date.now();
  if (!forceRefresh && _examCountCache.count !== null && (now - _examCountCache.timestamp) < 60000) {
    return _examCountCache.count;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    // 서버 측 날짜 필터링 (복합 인덱스 필요: userId + timestamp)
    const snapshot = await db.collection("exam_results")
      .where("userId", "==", currentUser.uid)
      .where("timestamp", ">=", today)
      .get();
    let count = 0;
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.deleted === true) return;
      count++;
    });
    _examCountCache = { count, timestamp: now };
    return count;
  } catch (e) {
    // 복합 인덱스가 없으면 기존 방식으로 폴백
    console.warn("서버 날짜 필터 실패(인덱스 생성 필요), 기존 방식 사용:", e.message);
    const snapshot = await db.collection("exam_results")
      .where("userId", "==", currentUser.uid)
      .get();
    let count = 0;
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.deleted === true) return;
      const ts = data.timestamp;
      if (!ts) return;
      const examDate = ts.toDate ? ts.toDate() : new Date(ts);
      if (examDate >= today) count++;
    });
    _examCountCache = { count, timestamp: now };
    return count;
  }
}

// 응시 횟수 UI 업데이트
async function updateExamCountUI() {
  if (!dom.examCountDisplay) return;
  dom.examCountDisplay.style.display = "inline-block";
  try {
    const count = await getTodayExamCount();
    const remaining = Math.max(0, 2 - count);
    dom.examCountText.textContent = `${count}회 / 2회 (잔여 ${remaining}회)`;
    if (remaining === 0) {
      dom.examCountDisplay.style.background = "#fde8e8";
      dom.examCountDisplay.style.color = "#d32f2f";
    } else {
      dom.examCountDisplay.style.background = "#e8f5e9";
      dom.examCountDisplay.style.color = "#2e7d32";
    }
  } catch (e) {
    console.warn("응시 횟수 UI 업데이트 실패:", e);
    dom.examCountText.textContent = "확인 불가";
  }
}

dom.startBtn.addEventListener("click", async () => {
  const selectedJob = dom.jobSelect.value;
  if (!selectedJob) {
    alert("직무를 먼저 선택해주세요.");
    return;
  }

  // 하루 응시 횟수 제한 체크 (2회)
  try {
    const todayCount = await getTodayExamCount();
    if (todayCount >= 2) {
      alert("오늘 응시 가능한 횟수(2회)를 모두 소진하였습니다.");
      return;
    }
  } catch (e) {
    console.warn("응시 횟수 확인 실패:", e);
  }

  dom.startBtn.disabled = true;
  dom.jobSelect.disabled = true;

  try {
    if (!questions.length) {
      await loadQuestionsByJob(selectedJob);
    }
    currentIndex = 0;
    started = true;
    timeLeft = 20 * 60; // 20분 고정
    dom.examScreen.classList.remove("hidden");
    dom.resultScreen.classList.add("hidden");
    render();
    dom.timer.textContent = `남은 시간: ${formatTime(timeLeft)}`;
    startTimer();
    saveState();

    // 글자 크기 컨트롤 초기화 및 저장된 글자 크기 적용
    initFontSizeControls();
    try {
      const savedSize = localStorage.getItem("cbt_font_size");
      if (savedSize) {
        setFontSize(parseInt(savedSize));
      } else {
        setFontSize(100); // 기본값
      }
    } catch (e) {
      console.warn("글자 크기 복원 실패", e);
      setFontSize(100);
    }
  } catch (error) {
    alert("문제를 로드하는데 실패했습니다: " + error.message);
    dom.startBtn.disabled = false;
    dom.jobSelect.disabled = false;
  }
});

// 로그아웃 버튼 이벤트
if (dom.logoutBtn) {
  dom.logoutBtn.addEventListener("click", async () => {
    try {
      // 로그아웃 전에 시험 상태 초기화
      localStorage.removeItem(STATE_KEY);

      // 타이머 정리
      if (timerId) clearInterval(timerId);

      await auth.signOut();
      window.location.href = "login.html";
    } catch (error) {
      console.error("로그아웃 오류:", error);
      alert("로그아웃 중 오류가 발생했습니다.");
    }
  });
}

// 공지사항 렌더링 (캐시된 데이터 사용 가능)
function renderNotificationData(notifications) {
  if (!notifications || notifications.length === 0) {
    dom.notificationList.innerHTML = `
      <div style="padding: 15px; text-align: center; color: #999; font-size: 14px;">
        현재 등록된 공지사항이 없습니다.
      </div>
    `;
    dom.notificationSection.style.display = "block";
    return;
  }

  dom.notificationList.innerHTML = "";
  notifications.forEach((data, index) => {
    const notifDiv = document.createElement("div");
    const isLast = index === notifications.length - 1;
    notifDiv.style.cssText = `
      padding: 15px;
      ${!isLast ? 'border-bottom: 2px solid #ffe9a0;' : ''}
      background: ${index % 2 === 0 ? '#fffbf0' : 'transparent'};
      border-radius: 4px;
      margin-bottom: ${!isLast ? '10px' : '0'};
    `;

    notifDiv.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
        <div style="font-weight: bold; color: #d32f2f; font-size: 16px;">${data.title}</div>
        <div style="font-size: 12px; color: #999; white-space: nowrap; margin-left: 10px;">${data.dateStr}</div>
      </div>
      <div style="color: #333; font-size: 14px; line-height: 1.6;">${data.content}</div>
    `;
    dom.notificationList.appendChild(notifDiv);
  });

  dom.notificationSection.style.display = "block";

  // 초기 상태 설정 (펼침 상태)
  setTimeout(() => {
    if (dom.notificationList) {
      dom.notificationList.style.maxHeight = dom.notificationList.scrollHeight + "px";
      dom.notificationList.style.opacity = "1";
    }
  }, 0);
}

// 공지사항 로드 (5분 캐시)
async function loadNotifications() {
  // 캐시가 유효하면 (5분 이내) Firestore 재조회 안 함
  const now = Date.now();
  if (_notificationCache.data !== null && (now - _notificationCache.timestamp) < 300000) {
    renderNotificationData(_notificationCache.data);
    return;
  }

  try {
    const snapshot = await db.collection("notifications")
      .where("active", "==", true)
      .orderBy("createdAt", "desc")
      .limit(5)
      .get();

    // 스냅샷 데이터를 캐시 가능한 형태로 변환
    const notifications = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      notifications.push({
        title: data.title,
        content: data.content,
        dateStr: data.createdAt ? new Date(data.createdAt.toDate()).toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }) : ''
      });
    });

    // 캐시에 저장
    _notificationCache = { data: notifications, timestamp: now };

    renderNotificationData(notifications);
  } catch (error) {
    console.error("공지사항 로드 실패:", error);
    dom.notificationList.innerHTML = `
      <div style="padding: 15px; text-align: center; color: #999; font-size: 14px;">
        공지사항을 불러올 수 없습니다.
      </div>
    `;
    dom.notificationSection.style.display = "block";

    setTimeout(() => {
      if (dom.notificationList) {
        dom.notificationList.style.maxHeight = dom.notificationList.scrollHeight + "px";
        dom.notificationList.style.opacity = "1";
      }
    }, 0);
  }
}

// 공지사항 토글 기능
let notificationExpanded = true; // 기본값: 펼침
function toggleNotification() {
  if (!dom.notificationList || !dom.notificationArrow) return;

  notificationExpanded = !notificationExpanded;

  if (notificationExpanded) {
    // 펼치기
    dom.notificationList.style.maxHeight = dom.notificationList.scrollHeight + "px";
    dom.notificationList.style.opacity = "1";
    dom.notificationArrow.style.transform = "rotate(0deg)";
    dom.notificationArrow.textContent = "▼";
  } else {
    // 접기
    dom.notificationList.style.maxHeight = "0";
    dom.notificationList.style.opacity = "0";
    dom.notificationArrow.style.transform = "rotate(-90deg)";
    dom.notificationArrow.textContent = "▶";
  }
}

// 공지사항 토글 버튼 이벤트 리스너
if (dom.notificationToggle) {
  dom.notificationToggle.addEventListener("click", toggleNotification);
}

// 글자 크기 변경 기능
let currentFontSize = 100; // 기본 100%

function setFontSize(size) {
  currentFontSize = size;
  const questionArea = dom.questionArea;

  if (questionArea) {
    // questionArea에 폰트 크기 적용
    questionArea.style.fontSize = size + "%";
  }

  // 모든 글자 크기 버튼 스타일 초기화
  const fontSizeButtons = document.querySelectorAll(".font-size-btn");
  fontSizeButtons.forEach(btn => {
    const btnSize = parseInt(btn.getAttribute("data-size"));
    if (btnSize === size) {
      // 선택된 버튼 스타일
      btn.style.background = "#4CAF50";
      btn.style.color = "white";
      btn.style.borderColor = "#4CAF50";
    } else {
      // 선택되지 않은 버튼 스타일
      btn.style.background = "#fff";
      btn.style.color = "#333";
      btn.style.borderColor = "#ddd";
    }
  });

  // localStorage에 저장
  try {
    localStorage.setItem("cbt_font_size", size.toString());
  } catch (e) {
    console.warn("글자 크기 저장 실패", e);
  }
}

// 글자 크기 버튼 이벤트 리스너 초기화
function initFontSizeControls() {
  const fontSizeButtons = document.querySelectorAll(".font-size-btn");
  fontSizeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const size = parseInt(btn.getAttribute("data-size"));
      setFontSize(size);
    });
  });
}

// Boot: try restore previous state (if user refreshed mid-exam)
(async function boot() {
  // 로그인 상태 확인
  if (typeof auth !== 'undefined') {
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        currentUser = user;

        // 사용자 이름 가져오기
        try {
          const userDoc = await db.collection("users").doc(user.uid).get();
          const userName = userDoc.exists ? userDoc.data().name : user.email;
          const userData = userDoc.exists ? userDoc.data() : {};
          // 관리자 권한 확인 (superAdmin, admin, 또는 기존 isAdmin)
          // isAdmin이 불리언 true 또는 문자열 "true"인 경우 모두 허용
          const isAdmin = userData.role === "superAdmin" || userData.role === "admin" || userData.isAdmin === true || userData.isAdmin === "true";
          console.log("사용자 권한 확인:", { role: userData.role, isAdmin: userData.isAdmin, 결과: isAdmin });

          // 소속 정보 가져오기
          const userStation = userDoc.exists ? userDoc.data().station : "";
          const userDepartment = userDoc.exists ? userDoc.data().department : "";

          // 전역 프로필 저장 (시험 제출 시 함께 저장하여 관리자 페이지 읽기 최적화)
          currentUserProfile = { name: userName, station: userStation, department: userDepartment };
          const locationInfo = userStation && userDepartment ? `[${userStation} ${userDepartment}] ` : "";

          if (dom.currentUserSpan) {
            dom.currentUserSpan.textContent = `${locationInfo}${userName}님 환영합니다!`;
          }
          if (dom.logoutBtn) {
            dom.logoutBtn.style.display = "inline-block";
          }
          // 관리자만 관리자 페이지 링크 표시
          if (dom.adminLink && isAdmin) {
            dom.adminLink.style.display = "inline";
          }
        } catch (error) {
          console.error("사용자 정보 로드 실패:", error);
          if (dom.currentUserSpan) {
            dom.currentUserSpan.textContent = `${user.email}님 환영합니다!`;
          }
          if (dom.logoutBtn) {
            dom.logoutBtn.style.display = "inline-block";
          }
        }

        // 공지사항 로드
        loadNotifications();

        // 응시 횟수 표시
        updateExamCountUI();

        // 사용자 인증 후 상태 복원
        try {
          restoreState();
          if (questions.length) {
            // Resume
            dom.startBtn.disabled = true;
            dom.jobSelect.disabled = true;
            dom.examScreen.classList.remove("hidden");
            if (started && timeLeft > 0) startTimer();
            render();
            dom.timer.textContent = started ? `남은 시간: ${formatTime(timeLeft)}` : "";

            // 글자 크기 컨트롤 초기화 및 복원
            initFontSizeControls();
            try {
              const savedSize = localStorage.getItem("cbt_font_size");
              if (savedSize) {
                setFontSize(parseInt(savedSize));
              } else {
                setFontSize(100); // 기본값
              }
            } catch (e) {
              console.warn("글자 크기 복원 실패", e);
              setFontSize(100);
            }
          } else {
            // 초기 상태 설정 - 직무가 선택되지 않았으면 시작 버튼 비활성화
            console.log("Initial jobSelect value:", dom.jobSelect.value);
            dom.startBtn.disabled = !dom.jobSelect.value;
            console.log("Start button disabled:", dom.startBtn.disabled);
          }
        } catch (e) {
          console.error(e);
        }
      } else {
        // 로그인하지 않은 경우 로그인 페이지로 리다이렉트
        window.location.href = "login.html";
      }
    });
  }
})();