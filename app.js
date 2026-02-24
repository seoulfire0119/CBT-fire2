// Basic CBT app (single-choice).
// Loads questions from fire-sample.json, auto-saves to localStorage, grades automatically.

const STATE_KEY = "cbt_state_v1";

let questions = [];
let currentIndex = 0;
let answers = {}; // { [id]: selectedIndex }
let timeLeft = 0; // seconds
let timerId = null;
let started = false;
let hintMode = false; // 힌트 모드 상태
let reviewMode = false; // 리뷰 모드 상태

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
  hintBtn: document.getElementById("hintBtn"),
  reviewModeBtn: document.getElementById("reviewModeBtn"),
  resultReviewModeBtn: document.getElementById("resultReviewModeBtn"),
  scoreLine: document.getElementById("scoreLine"),
  reviewArea: document.getElementById("reviewArea"),
  restartBtn: document.getElementById("restartBtn"),
};

// DOM 요소 확인
console.log("DOM elements:", {
  jobSelect: dom.jobSelect,
  startBtn: dom.startBtn
});

// 직무별 문제 구성
const JOB_CONFIGS = {
  commander: [
    { file: 'public/data/safety.json', count: 10 },    // 안전관리 10문제
    { file: 'public/data/facility.json', count: 10 }   // 소방시설분야 10문제
  ],
  firefighter: [
    { file: 'public/data/fire.json', count: 10 },      // 화재분야 10문제
    { file: 'public/data/facility.json', count: 5 },   // 소방시설분야 5문제
    { file: 'public/data/safety.json', count: 5 }      // 안전관리 5문제
  ],
  rescuer: [
    { file: 'public/data/rescue.json', count: 10 },    // 구조분야 10문제
    { file: 'public/data/facility.json', count: 5 },   // 소방시설분야 5문제
    { file: 'public/data/safety.json', count: 5 }      // 안전관리 5문제
  ],
  paramedic: [
    { file: 'public/data/emergency.json', count: 15 }, // 구급분야 15문제
    { file: 'public/data/safety.json', count: 5 }      // 안전관리 5문제
  ]
};

// Restore from localStorage (if any)
function restoreState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
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
      JSON.stringify({ questions, answers, timeLeft, started })
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
  let questionCounter = 1;
  
  for (const { file, count } of config) {
    const res = await fetch(file);
    if (!res.ok) throw new Error("문항 로드 실패: " + file);
    const data = await res.json();
    
    // 각 출처에서 랜덤으로 문제 선택
    const selectedQuestions = getRandomQuestions(data, count);
    
    // 문제 ID를 고유하게 변경하여 중복 방지
    selectedQuestions.forEach(q => {
      q.uniqueId = `Q${questionCounter++}`;
    });
    
    questions.push(...selectedQuestions);
  }
  
  // 전체 문제 순서 다시 섞기
  questions = questions.sort(() => Math.random() - 0.5);
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
    if (answers[q.uniqueId || q.id] != null) className += " answered";
    
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
    const id = `q_${q.id}_choice_${idx}`;
    const label = document.createElement("label");
    label.className = "choice";
    
    // 리뷰 모드 또는 힌트 모드에서 정답/오답 표시
    if ((reviewMode && reviewItem) || hintMode || reviewMode) {
      // 정답 인덱스 계산 - answer가 1부터 시작하는 경우 보정
      let correctAnswerIndex;
      if (Array.isArray(q.answer)) {
        correctAnswerIndex = q.answer[0] - 1; // 1부터 시작하면 -1
        if (correctAnswerIndex < 0) correctAnswerIndex = q.answer[0]; // 이미 0부터 시작하면 그대로
      } else {
        correctAnswerIndex = q.answer - 1; // 1부터 시작하면 -1
        if (correctAnswerIndex < 0) correctAnswerIndex = q.answer; // 이미 0부터 시작하면 그대로
      }
      
      if (reviewMode && reviewItem) {
        console.log("Question:", q.id, "Correct answer index:", correctAnswerIndex, "Current idx:", idx, "Review item correct:", reviewItem.isCorrect);
        
        if (idx === correctAnswerIndex) {
          label.className += " correct-answer";
        }
        if (reviewItem.selected === idx && !reviewItem.isCorrect) {
          label.className += " wrong-answer";
        }
      } else if (hintMode || reviewMode) {
        // 힌트 모드 또는 리뷰 모드: 정답은 초록색, 선택한 오답은 빨간색
        if (idx === correctAnswerIndex) {
          label.className += " correct-answer";
        }
        if (answers[q.uniqueId || q.id] === idx && answers[q.uniqueId || q.id] !== correctAnswerIndex) {
          label.className += " wrong-answer";
        }
      }
    }
    
    const input = document.createElement("input");
    input.type = "radio";
    input.name = `q_${q.uniqueId || q.id}`;
    input.id = id;
    input.checked = answers[q.uniqueId || q.id] === idx;
    
    if (!reviewMode) {
      input.addEventListener("change", () => {
        answers[q.uniqueId || q.id] = idx;
        saveState();
        // Update list badge
        renderQuestionList();
        // 힌트 모드 또는 리뷰 모드일 때 실시간 색깔 업데이트
        if (hintMode || reviewMode) {
          render();
        }
      });
    } else {
      input.disabled = true; // 리뷰 모드에서는 수정 불가
    }
    
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
  
  dom.questionArea.innerHTML = "";
  dom.questionArea.appendChild(container);
}

function render(reviewMode = false, reviewData = null) {
  renderQuestionList(reviewMode, reviewData);
  renderQuestion(reviewMode, reviewData);
  dom.prevBtn.disabled = currentIndex === 0;
  dom.nextBtn.disabled = currentIndex === questions.length - 1;
}

function submitExam() {
  // Grade
  let correct = 0;
  const review = [];
  questions.forEach(q => {
    const selected = answers[q.uniqueId || q.id];
    const isCorrect = Array.isArray(q.answer) ? q.answer.includes(selected + 1) || q.answer.includes(selected) : (q.answer === selected + 1 || q.answer === selected);
    // Note: in this dataset, answer is [index starting at 1]
    if (Array.isArray(q.answer)) {
      if (q.answer.includes(selected + 1)) correct += 1;
    } else {
      if ((q.answer === selected + 1) || (q.answer === selected)) correct += 1;
    }
    review.push({ q, selected, isCorrect });
  });
  const total = questions.length;
  dom.scoreLine.textContent = `총점: ${correct} / ${total} (${Math.round((correct/total)*100)}점)`;

  // Review UI
  dom.reviewArea.innerHTML = "";
  review.forEach((r, idx) => {
    const card = document.createElement("div");
    card.className = "review-card " + (r.isCorrect ? "correct" : "incorrect");
    const title = document.createElement("h3");
    title.textContent = `문항 ${idx + 1}. ${r.q.stem}`;
    const your = document.createElement("p");
    your.innerHTML = `<strong>내 답:</strong> ${r.selected != null ? r.q.choices[r.selected] : "(무응답)"}`;

    const ansIndex = Array.isArray(r.q.answer) ? r.q.answer[0] : r.q.answer;
    const correctP = document.createElement("p");
    correctP.innerHTML = `<strong>정답:</strong> ${r.q.choices[(ansIndex-1 >=0)? ansIndex-1 : ansIndex] || ansIndex}`;

    const explain = document.createElement("div");
    explain.className = "explain";
    explain.innerHTML = `<div><strong>해설:</strong> ${r.q.explanation || "해설 없음"}</div><div class="meta">${r.q.reference ? "근거/출처: " + r.q.reference : ""}</div>`;

    card.appendChild(title);
    card.appendChild(your);
    card.appendChild(correctP);
    card.appendChild(explain);
    dom.reviewArea.appendChild(card);
  });

  // Add review button to result screen  
  const reviewBtn = document.createElement("button");
  reviewBtn.textContent = "문제 다시 보기";
  reviewBtn.className = "review-btn";
  reviewBtn.addEventListener("click", () => {
    currentIndex = 0;
    dom.resultScreen.classList.add("hidden");
    dom.examScreen.classList.remove("hidden");
    // 리뷰 모드로 렌더링
    render(true, review);
    
    // 네비게이션 버튼 업데이트
    dom.prevBtn.addEventListener("click", () => {
      if (currentIndex > 0) { 
        currentIndex -= 1; 
        render(true, review); 
      }
    });
    dom.nextBtn.addEventListener("click", () => {
      if (currentIndex < questions.length - 1) { 
        currentIndex += 1; 
        render(true, review); 
      }
    });
    
    // 제출 버튼 숨기기
    dom.submitBtn.style.display = "none";
  });
  
  // Add buttons to result screen - 기존 restartBtn이 있으면 교체, 없으면 추가
  let buttonContainer = dom.reviewArea.parentNode.querySelector('.result-buttons');
  if (!buttonContainer) {
    buttonContainer = document.createElement("div");
    buttonContainer.className = "result-buttons";
    
    // restartBtn을 찾아서 교체하거나 reviewArea 다음에 추가
    if (dom.restartBtn && dom.restartBtn.parentNode) {
      dom.restartBtn.parentNode.replaceChild(buttonContainer, dom.restartBtn);
    } else {
      dom.reviewArea.parentNode.appendChild(buttonContainer);
    }
  }
  
  // 버튼들을 컨테이너에 추가
  buttonContainer.innerHTML = "";
  buttonContainer.appendChild(reviewBtn);
  
  const newRestartBtn = document.createElement("button");
  newRestartBtn.textContent = "다시 풀기";
  newRestartBtn.className = "restart-btn";
  newRestartBtn.addEventListener("click", restart);
  buttonContainer.appendChild(newRestartBtn);

  // 결과 페이지 리뷰 모드 버튼 이벤트 추가
  if (dom.resultReviewModeBtn) {
    // 기존 이벤트 리스너 제거 후 새로 추가
    const newBtn = dom.resultReviewModeBtn.cloneNode(true);
    dom.resultReviewModeBtn.parentNode.replaceChild(newBtn, dom.resultReviewModeBtn);
    dom.resultReviewModeBtn = newBtn;
    
    let resultReviewMode = false;
    dom.resultReviewModeBtn.addEventListener("click", () => {
      resultReviewMode = !resultReviewMode;
      dom.resultReviewModeBtn.textContent = resultReviewMode ? "🔍 표시: ON" : "🔍 정답/오답 표시";
      dom.resultReviewModeBtn.className = resultReviewMode ? "review-mode active" : "review-mode";
      
      // 결과 카드들의 스타일 업데이트
      const reviewCards = dom.reviewArea.querySelectorAll('.review-card');
      reviewCards.forEach((card, idx) => {
        const reviewItem = review[idx];
        if (!reviewItem) return;
        
        const choices = card.querySelectorAll('p');
        if (choices.length >= 2) {
          const myAnswerP = choices[0];
          const correctAnswerP = choices[1];
          
          if (resultReviewMode) {
            // 리뷰 모드 ON: 내 답안과 정답에 색상 표시
            if (reviewItem.isCorrect) {
              myAnswerP.style.color = "#4caf50";
              myAnswerP.style.fontWeight = "bold";
            } else {
              myAnswerP.style.color = "#f44336";
              myAnswerP.style.fontWeight = "bold";
            }
            correctAnswerP.style.color = "#4caf50";
            correctAnswerP.style.fontWeight = "bold";
          } else {
            // 리뷰 모드 OFF: 기본 스타일
            myAnswerP.style.color = "";
            myAnswerP.style.fontWeight = "";
            correctAnswerP.style.color = "";
            correctAnswerP.style.fontWeight = "";
          }
        }
      });
    });
  }

  // Switch screens
  dom.examScreen.classList.add("hidden");
  dom.resultScreen.classList.remove("hidden");

  // Clear running timer & state
  if (timerId) clearInterval(timerId);
  started = false;
  saveState();
}

function restart() {
  answers = {};
  started = false;
  timeLeft = 0;
  questions = [];
  currentIndex = 0;
  hintMode = false; // 힌트 모드 초기화
  reviewMode = false; // 리뷰 모드 초기화
  saveState();
  dom.resultScreen.classList.add("hidden");
  dom.examScreen.classList.add("hidden");
  dom.jobSelect.disabled = false;
  dom.startBtn.disabled = !dom.jobSelect.value;
  dom.timer.textContent = "";
  
  // 힌트 버튼 초기화
  dom.hintBtn.textContent = "힌트 보기: OFF";
  dom.hintBtn.className = "hint-toggle";
  
  // 리뷰 모드 버튼 초기화
  if (dom.reviewModeBtn) {
    dom.reviewModeBtn.textContent = "🔍 정답 미리보기";
    dom.reviewModeBtn.className = "review-mode";
  }
  
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
dom.submitBtn.addEventListener("click", submitExam);
dom.restartBtn.addEventListener("click", restart);

// 힌트 버튼 이벤트 리스너
dom.hintBtn.addEventListener("click", () => {
  hintMode = !hintMode;
  dom.hintBtn.textContent = hintMode ? "힌트 보기: ON" : "힌트 보기: OFF";
  dom.hintBtn.className = hintMode ? "hint-toggle active" : "hint-toggle";
  
  // 현재 화면 즉시 업데이트
  render();
});

// 시험 중 리뷰 모드 버튼 이벤트 리스너
if (dom.reviewModeBtn) {
  dom.reviewModeBtn.addEventListener("click", () => {
    reviewMode = !reviewMode;
    dom.reviewModeBtn.textContent = reviewMode ? "🔍 미리보기: ON" : "🔍 정답 미리보기";
    dom.reviewModeBtn.className = reviewMode ? "review-mode active" : "review-mode";
    
    // 현재 화면 즉시 업데이트
    render();
  });
}

// Job selection handler
dom.jobSelect.addEventListener("change", () => {
  const selected = dom.jobSelect.value;
  console.log("Job selected:", selected);
  dom.startBtn.disabled = !selected;
  if (selected) {
    questions = []; // Clear previous questions
  }
});

dom.startBtn.addEventListener("click", async () => {
  const selectedJob = dom.jobSelect.value;
  if (!selectedJob) {
    alert("직무를 먼저 선택해주세요.");
    return;
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
  } catch (error) {
    alert("문제를 로드하는데 실패했습니다: " + error.message);
    dom.startBtn.disabled = false;
    dom.jobSelect.disabled = false;
  }
});

// Boot: try restore previous state (if user refreshed mid-exam)
(async function boot() {
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
    }
  } catch (e) {
    console.error(e);
  }
  
  // 초기 상태 설정 - 직무가 선택되지 않았으면 시작 버튼 비활성화
  console.log("Initial jobSelect value:", dom.jobSelect.value);
  dom.startBtn.disabled = !dom.jobSelect.value;
  console.log("Start button disabled:", dom.startBtn.disabled);
})();