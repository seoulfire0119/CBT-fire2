// 관리자 페이지 스크립트

let allResults = [];
let filteredResults = [];
let userNames = {}; // userId -> name 매핑
let userInfo = {}; // userId -> {name, station, department} 매핑
let currentUserRole = null; // 현재 사용자 권한 (superAdmin, admin)

// 페이지네이션 변수
let currentPage = 1;
let itemsPerPage = 100;

const adminDom = {
  adminUser: document.getElementById("adminUser"),
  searchBtn: document.getElementById("searchBtn"),
  guideMessage: document.getElementById("guideMessage"),
  totalUsers: document.getElementById("totalUsers"),
  totalExams: document.getElementById("totalExams"),
  avgScore: document.getElementById("avgScore"),
  maxScore: document.getElementById("maxScore"),
  detailedStats: document.getElementById("detailedStats"),
  stationStats: document.getElementById("stationStats"),
  jobStats: document.getElementById("jobStats"),
  departmentStats: document.getElementById("departmentStats"),
  startDate: document.getElementById("startDate"),
  endDate: document.getElementById("endDate"),
  clearDateBtn: document.getElementById("clearDateBtn"),
  dateRangeError: document.getElementById("dateRangeError"),
  stationFilter: document.getElementById("stationFilter"),
  departmentFilter: document.getElementById("departmentFilter"),
  jobFilter: document.getElementById("jobFilter"),
  userSearchInput: document.getElementById("userSearchInput"),
  refreshBtn: document.getElementById("refreshBtn"),
  exportBtn: document.getElementById("exportBtn"),
  loadingMessage: document.getElementById("loadingMessage"),
  noDataMessage: document.getElementById("noDataMessage"),
  resultsTable: document.getElementById("resultsTable"),
  resultsBody: document.getElementById("resultsBody"),
  // 페이지네이션
  paginationContainer: document.getElementById("paginationContainer"),
  paginationInfo: document.getElementById("paginationInfo"),
  paginationNumbers: document.getElementById("paginationNumbers"),
  prevPageBtn: document.getElementById("prevPageBtn"),
  nextPageBtn: document.getElementById("nextPageBtn"),
  pageSizeSelect: document.getElementById("pageSizeSelect"),
  notifTitle: document.getElementById("notifTitle"),
  notifContent: document.getElementById("notifContent"),
  addNotifBtn: document.getElementById("addNotifBtn"),
  notifListAdmin: document.getElementById("notifListAdmin")
};

// 점수에 따른 배지 클래스 반환
function getScoreBadgeClass(score) {
  if (score >= 90) return "score-excellent";
  if (score >= 70) return "score-good";
  if (score >= 50) return "score-average";
  return "score-poor";
}

// 시간 포맷 (초 -> 분:초)
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}분 ${s}초`;
}

// 날짜 포맷
function formatDate(timestamp) {
  if (!timestamp) return "-";
  const date = timestamp.toDate();
  return date.toLocaleString("ko-KR");
}

// Flatpickr 인스턴스
let startDatePicker = null;
let endDatePicker = null;

// 날짜 변경 중 중복 로드 방지 플래그
let _adminDateChanging = false;

// 날짜 선택기 초기화
function initializeDatePickers() {
  // 기본 시작일: 30일 전
  const defaultStart = new Date();
  defaultStart.setDate(defaultStart.getDate() - 30);

  const commonConfig = {
    locale: "ko",
    dateFormat: "Y-m-d",
    allowInput: false,
    disableMobile: true
  };

  // 초기화 중에는 onChange가 loadResults를 호출하지 않도록 플래그 설정
  _adminDateChanging = true;

  // 시작일 선택기 (기본값: 30일 전)
  startDatePicker = flatpickr(adminDom.startDate, {
    ...commonConfig,
    defaultDate: defaultStart,
    onChange: function(selectedDates, dateStr) {
      if (_adminDateChanging) return;
      if (selectedDates[0]) {
        endDatePicker.set("minDate", dateStr);

        const maxDate = new Date(selectedDates[0]);
        maxDate.setFullYear(maxDate.getFullYear() + 1);
        endDatePicker.set("maxDate", maxDate);

        validateDateRange();
      }
      loadResults();
    }
  });

  // 종료일 선택기
  endDatePicker = flatpickr(adminDom.endDate, {
    ...commonConfig,
    onChange: function(selectedDates, dateStr) {
      if (_adminDateChanging) return;
      if (selectedDates[0]) {
        startDatePicker.set("maxDate", dateStr);

        const minDate = new Date(selectedDates[0]);
        minDate.setFullYear(minDate.getFullYear() - 1);
        startDatePicker.set("minDate", minDate);

        validateDateRange();
      }
      loadResults();
    }
  });

  // 초기화 완료 후 플래그 해제
  _adminDateChanging = false;

  // 초기화 버튼 이벤트
  adminDom.clearDateBtn.addEventListener("click", clearDateRange);
}

// 날짜 범위 유효성 검사 (최대 1년)
function validateDateRange() {
  const startDate = startDatePicker.selectedDates[0];
  const endDate = endDatePicker.selectedDates[0];

  if (startDate && endDate) {
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 365) {
      adminDom.dateRangeError.textContent = "최대 1년까지만 조회 가능합니다.";
      return false;
    } else {
      adminDom.dateRangeError.textContent = "";
      return true;
    }
  }

  adminDom.dateRangeError.textContent = "";
  return true;
}

// 날짜 범위 초기화 (기본 30일로 리셋)
function clearDateRange() {
  _adminDateChanging = true;
  startDatePicker.clear();
  endDatePicker.clear();
  startDatePicker.set("minDate", null);
  startDatePicker.set("maxDate", null);
  endDatePicker.set("minDate", null);
  endDatePicker.set("maxDate", null);
  adminDom.dateRangeError.textContent = "";

  // 기본 30일 전으로 재설정
  const defaultStart = new Date();
  defaultStart.setDate(defaultStart.getDate() - 30);
  startDatePicker.setDate(defaultStart);
  _adminDateChanging = false;

  loadResults();
}

// 날짜가 선택된 범위에 속하는지 확인
function isInDateRange(timestamp, startDate, endDate) {
  if (!timestamp) return true;
  if (!startDate && !endDate) return true;

  const date = timestamp.toDate();

  // 시간을 제외하고 날짜만 비교
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (startDate && !endDate) {
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    return dateOnly >= start;
  }

  if (!startDate && endDate) {
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    return dateOnly <= end;
  }

  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  return dateOnly >= start && dateOnly <= end;
}

// 특정 userId 목록만 읽어서 userInfo 캐시 채우기 (최대 30개씩 배치)
async function fetchMissingUsers(userIds) {
  const missing = userIds.filter(uid => uid && !userInfo[uid]);
  if (missing.length === 0) return;

  for (let i = 0; i < missing.length; i += 30) {
    const batch = missing.slice(i, i + 30);
    try {
      const snap = await db.collection("users")
        .where(firebase.firestore.FieldPath.documentId(), "in", batch)
        .get();
      snap.forEach(doc => {
        const d = doc.data();
        userInfo[doc.id] = {
          name: d.name || d.email || "-",
          station: d.station || "-",
          department: d.department || "-"
        };
      });
    } catch (e) {
      console.warn("유저 배치 로드 실패:", e);
    }
  }
}

// 시험 결과 데이터 로드 (서버 측 날짜 필터 적용)
async function loadResults() {
  adminDom.loadingMessage.style.display = "block";
  if (adminDom.guideMessage) adminDom.guideMessage.style.display = "none";
  adminDom.noDataMessage.style.display = "none";
  adminDom.resultsTable.style.display = "none";

  try {
    // 날짜 범위 결정 (기본: 최근 30일)
    let queryStart = startDatePicker ? startDatePicker.selectedDates[0] : null;
    let queryEnd = endDatePicker ? endDatePicker.selectedDates[0] : null;

    if (!queryStart && !queryEnd) {
      queryStart = new Date();
      queryStart.setDate(queryStart.getDate() - 30);
      queryStart.setHours(0, 0, 0, 0);
    }

    // 소속 필터 (선택된 경우 서버 쿼리에 반영)
    const selectedStation = adminDom.stationFilter.value;

    // 시험 결과 로드 (서버 측 날짜 필터 + 최신순 정렬)
    let query = db.collection("exam_results").orderBy("timestamp", "desc");

    if (queryStart) {
      const start = new Date(queryStart);
      start.setHours(0, 0, 0, 0);
      query = query.where("timestamp", ">=", start);
    }
    if (queryEnd) {
      const end = new Date(queryEnd);
      end.setHours(23, 59, 59, 999);
      query = query.where("timestamp", "<=", end);
    }
    if (selectedStation) {
      query = query.where("userStation", "==", selectedStation);
    }

    const snapshot = await query.get();

    // deleted 제외하고 수집, embedded 유저정보 없는 것만 별도 로드
    const rawResults = [];
    const needUserFetch = new Set();

    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.deleted === true) return;
      rawResults.push({ id: doc.id, ...data });
      // exam_results에 유저 정보가 없는 구형 데이터는 users에서 읽어야 함
      if (!data.userName && data.userId) {
        needUserFetch.add(data.userId);
      }
    });

    // 필요한 유저만 골라서 읽기 (전체 users 컬렉션 X)
    await fetchMissingUsers([...needUserFetch]);

    allResults = rawResults.map(data => {
      if (data.userName) {
        // 신형: exam_results에 유저 정보 포함
        return {
          ...data,
          userStation: data.userStation || "-",
          userDepartment: data.userDepartment || "-"
        };
      }
      // 구형: users에서 읽어온 정보 사용
      const ui = userInfo[data.userId] || { name: data.userEmail || "-", station: "-", department: "-" };
      return {
        ...data,
        userName: ui.name,
        userStation: ui.station,
        userDepartment: ui.department
      };
    });

    // 필터 드롭다운 업데이트
    updateFilters();

    // 데이터 필터링 및 표시
    applyFilters();
  } catch (error) {
    console.error("데이터 로드 실패:", error);
    adminDom.loadingMessage.textContent = "데이터 로드 실패: " + error.message;
  }
}

// 소속 드롭다운을 STATION_NAMES로 미리 채우기
function initStationFilter() {
  if (typeof STATION_NAMES === "undefined") return;
  const current = adminDom.stationFilter.value;
  adminDom.stationFilter.innerHTML = '<option value="">전체</option>';
  STATION_NAMES.forEach(name => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    adminDom.stationFilter.appendChild(option);
  });
  if (current) adminDom.stationFilter.value = current;
}

// 필터 드롭다운 업데이트 (소속은 건드리지 않음)
function updateFilters() {
  updateDepartmentFilter();
}

// 부서 필터 업데이트 (소속에 따라 필터링)
function updateDepartmentFilter() {
  const selectedStation = adminDom.stationFilter.value;

  const uniqueDepartments = new Set();
  allResults.forEach(result => {
    if (result.userDepartment && result.userDepartment !== "-") {
      // 소속이 선택되지 않았거나, 선택된 소속과 일치하는 경우만 추가
      if (!selectedStation || result.userStation === selectedStation) {
        uniqueDepartments.add(result.userDepartment);
      }
    }
  });

  adminDom.departmentFilter.innerHTML = '<option value="">전체</option>';
  Array.from(uniqueDepartments).sort().forEach(dept => {
    const option = document.createElement("option");
    option.value = dept;
    option.textContent = dept;
    adminDom.departmentFilter.appendChild(option);
  });
}

// 필터 적용
function applyFilters() {
  const startDate = startDatePicker ? startDatePicker.selectedDates[0] : null;
  const endDate = endDatePicker ? endDatePicker.selectedDates[0] : null;
  const stationFilter = adminDom.stationFilter.value;
  const departmentFilter = adminDom.departmentFilter.value;
  const jobFilter = adminDom.jobFilter.value;
  const userSearch = adminDom.userSearchInput.value.trim().toLowerCase();

  filteredResults = allResults.filter(result => {
    if (!isInDateRange(result.timestamp, startDate, endDate)) return false;
    if (stationFilter && result.userStation !== stationFilter) return false;
    if (departmentFilter && result.userDepartment !== departmentFilter) return false;
    if (jobFilter && result.jobType !== jobFilter) return false;
    // 사용자 이름 검색 (부분 일치)
    if (userSearch && !result.userName.toLowerCase().includes(userSearch)) return false;
    return true;
  });

  // 필터 변경 시 첫 페이지로 이동
  currentPage = 1;

  updateStats();
  renderResults();
}

// 통계 업데이트
function updateStats() {
  if (filteredResults.length === 0) {
    adminDom.totalUsers.textContent = "0";
    adminDom.totalExams.textContent = "0";
    adminDom.avgScore.textContent = "-";
    adminDom.maxScore.textContent = "-";
    adminDom.detailedStats.style.display = "none";
    return;
  }

  // 고유 사용자 수
  const uniqueUsers = new Set(filteredResults.map(r => r.userId));
  adminDom.totalUsers.textContent = uniqueUsers.size;

  // 총 시험 횟수
  adminDom.totalExams.textContent = filteredResults.length;

  // 평균 점수
  const avgScore = filteredResults.reduce((sum, r) => sum + r.score, 0) / filteredResults.length;
  adminDom.avgScore.textContent = Math.round(avgScore) + "점";

  // 최고 점수
  const maxScore = Math.max(...filteredResults.map(r => r.score));
  adminDom.maxScore.textContent = maxScore + "점";

  // 상세 통계 업데이트
  updateDetailedStats();
}

// 소방서별 통계 데이터 및 더보기 상태
let _allStationData = [];
let _stationShowCount = 5;
let _selectedStation = null;

// 상세 통계 업데이트
function updateDetailedStats() {
  adminDom.detailedStats.style.display = "block";

  // 소방서별 평균 점수 계산
  const stationScores = {};
  filteredResults.forEach(result => {
    const station = result.userStation || "미분류";
    if (!stationScores[station]) {
      stationScores[station] = { total: 0, count: 0 };
    }
    stationScores[station].total += result.score;
    stationScores[station].count += 1;
  });

  _allStationData = Object.entries(stationScores)
    .map(([station, data]) => ({ station, avg: Math.round(data.total / data.count), count: data.count }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 50);

  _stationShowCount = 5;
  _selectedStation = null;
  renderStationStats();

  // 직무별 합격률 (70점 이상)
  const jobPass = {};
  filteredResults.forEach(result => {
    const job = result.jobName || result.jobType;
    if (!jobPass[job]) {
      jobPass[job] = { pass: 0, total: 0 };
    }
    jobPass[job].total += 1;
    if (result.score >= 70) {
      jobPass[job].pass += 1;
    }
  });

  adminDom.jobStats.innerHTML = "";
  Object.entries(jobPass)
    .map(([job, data]) => ({ job, rate: Math.round((data.pass / data.total) * 100) }))
    .sort((a, b) => b.rate - a.rate)
    .forEach(item => {
      const li = document.createElement("li");
      li.innerHTML = `<span class="stats-label">${item.job}</span><span class="stats-value">${item.rate}%</span>`;
      adminDom.jobStats.appendChild(li);
    });

  // 안전센터별 참여 인원 - 초기 안내 표시
  resetDepartmentStats();
}

// 소방서별 평균 점수 렌더링 (더보기 지원)
function renderStationStats() {
  adminDom.stationStats.innerHTML = "";

  const itemsToShow = _allStationData.slice(0, _stationShowCount);

  itemsToShow.forEach(item => {
    const li = document.createElement("li");
    li.className = "station-item" + (item.station === _selectedStation ? " selected" : "");
    li.innerHTML = `<span class="stats-label">${item.station}</span><span class="stats-value">${item.avg}점 (${item.count}명)</span>`;
    li.addEventListener("click", () => {
      _selectedStation = item.station;
      renderStationStats();
      showStationDepartments(item.station);
    });
    adminDom.stationStats.appendChild(li);
  });

  // 더보기 버튼 (더 표시할 항목이 있을 때만)
  if (_stationShowCount < _allStationData.length) {
    const moreBtn = document.createElement("li");
    moreBtn.className = "stats-more-btn";
    moreBtn.textContent = `더보기 (${Math.min(_stationShowCount, _allStationData.length)}/${_allStationData.length})`;
    moreBtn.addEventListener("click", () => {
      _stationShowCount = Math.min(_stationShowCount + 5, 50);
      renderStationStats();
    });
    adminDom.stationStats.appendChild(moreBtn);
  }
}

// 안전센터별 참여 인원 초기 상태
function resetDepartmentStats() {
  const deptTitle = adminDom.departmentStats.parentElement.querySelector("h3");
  deptTitle.textContent = "안전센터별 참여 인원";

  adminDom.departmentStats.innerHTML = "";
  const guide = document.createElement("li");
  guide.className = "dept-guide";
  guide.textContent = "소방서를 클릭하면 안전센터별 참여 인원이 표시됩니다.";
  adminDom.departmentStats.appendChild(guide);
}

// 선택한 소방서의 안전센터별 참여 인원 표시
function showStationDepartments(stationName) {
  // 제목 업데이트
  const deptTitle = adminDom.departmentStats.parentElement.querySelector("h3");
  deptTitle.textContent = stationName + " - 안전센터별 참여 인원";

  // 해당 소방서 결과만 필터링
  const stationResults = filteredResults.filter(r => (r.userStation || "미분류") === stationName);

  const departmentCount = {};
  stationResults.forEach(result => {
    const dept = result.userDepartment || "미분류";
    departmentCount[dept] = (departmentCount[dept] || 0) + 1;
  });

  adminDom.departmentStats.innerHTML = "";

  const deptEntries = Object.entries(departmentCount)
    .map(([dept, count]) => ({ dept, count }))
    .sort((a, b) => b.count - a.count);

  if (deptEntries.length === 0) {
    const li = document.createElement("li");
    li.className = "dept-guide";
    li.textContent = "참여 데이터가 없습니다.";
    adminDom.departmentStats.appendChild(li);
    return;
  }

  deptEntries.forEach(item => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="stats-label">${item.dept}</span><span class="stats-value">${item.count}명</span>`;
    adminDom.departmentStats.appendChild(li);
  });
}

// 결과 테이블 렌더링
function renderResults() {
  adminDom.loadingMessage.style.display = "none";
  if (adminDom.guideMessage) adminDom.guideMessage.style.display = "none";

  if (filteredResults.length === 0) {
    adminDom.noDataMessage.style.display = "block";
    adminDom.resultsTable.style.display = "none";
    adminDom.paginationContainer.style.display = "none";
    return;
  }

  adminDom.noDataMessage.style.display = "none";
  adminDom.resultsTable.style.display = "table";

  // 페이지네이션 계산
  const totalItems = filteredResults.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // 현재 페이지가 총 페이지를 초과하면 조정
  if (currentPage > totalPages) {
    currentPage = totalPages;
  }
  if (currentPage < 1) {
    currentPage = 1;
  }

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentPageResults = filteredResults.slice(startIndex, endIndex);

  adminDom.resultsBody.innerHTML = "";

  currentPageResults.forEach(result => {
    const row = document.createElement("tr");

    const dateCell = document.createElement("td");
    dateCell.textContent = formatDate(result.timestamp);
    row.appendChild(dateCell);

    const userCell = document.createElement("td");
    userCell.textContent = result.userName;
    row.appendChild(userCell);

    const stationCell = document.createElement("td");
    stationCell.textContent = result.userStation || "-";
    row.appendChild(stationCell);

    const departmentCell = document.createElement("td");
    departmentCell.textContent = result.userDepartment || "-";
    row.appendChild(departmentCell);

    const jobCell = document.createElement("td");
    jobCell.textContent = result.jobName || result.jobType;
    row.appendChild(jobCell);

    const scoreCell = document.createElement("td");
    const scoreBadge = document.createElement("span");
    scoreBadge.className = `score-badge ${getScoreBadgeClass(result.score)}`;
    scoreBadge.textContent = result.score + "점";
    scoreCell.appendChild(scoreBadge);
    row.appendChild(scoreCell);

    const answersCell = document.createElement("td");
    answersCell.textContent = `${result.correct} / ${result.total}`;
    row.appendChild(answersCell);

    const timeCell = document.createElement("td");
    timeCell.textContent = formatTime(result.timeTaken || 0);
    row.appendChild(timeCell);

    // 삭제 버튼 (최종관리자만)
    const actionCell = document.createElement("td");
    if (isSuperAdmin()) {
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-btn";
      deleteBtn.textContent = "삭제";
      deleteBtn.addEventListener("click", () => deleteResult(result.id, result.userName, result.jobName || result.jobType, result.score));
      actionCell.appendChild(deleteBtn);
    } else {
      actionCell.textContent = "-";
      actionCell.style.color = "#999";
    }
    row.appendChild(actionCell);

    adminDom.resultsBody.appendChild(row);
  });

  // 페이지네이션 UI 업데이트
  renderPagination(totalPages, totalItems, startIndex, endIndex);
}

// 페이지네이션 UI 렌더링
function renderPagination(totalPages, totalItems, startIndex, endIndex) {
  if (totalItems === 0) {
    adminDom.paginationContainer.style.display = "none";
    return;
  }

  // 데이터가 있으면 항상 페이지네이션 표시
  adminDom.paginationContainer.style.display = "flex";

  // 페이지 정보 표시
  adminDom.paginationInfo.textContent = `총 ${totalItems}건 중 ${startIndex + 1}-${endIndex}건 (${currentPage}/${totalPages} 페이지)`;

  // 이전/다음 버튼 상태
  adminDom.prevPageBtn.disabled = currentPage <= 1;
  adminDom.nextPageBtn.disabled = currentPage >= totalPages;

  // 페이지 번호 버튼 생성
  adminDom.paginationNumbers.innerHTML = "";

  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  // 시작 페이지 조정
  if (endPage - startPage < maxVisiblePages - 1) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  // 첫 페이지 표시
  if (startPage > 1) {
    const firstBtn = createPageButton(1);
    adminDom.paginationNumbers.appendChild(firstBtn);

    if (startPage > 2) {
      const ellipsis = document.createElement("span");
      ellipsis.className = "pagination-ellipsis";
      ellipsis.textContent = "...";
      adminDom.paginationNumbers.appendChild(ellipsis);
    }
  }

  // 페이지 번호 버튼
  for (let i = startPage; i <= endPage; i++) {
    const btn = createPageButton(i);
    if (i === currentPage) {
      btn.classList.add("active");
    }
    adminDom.paginationNumbers.appendChild(btn);
  }

  // 마지막 페이지 표시
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const ellipsis = document.createElement("span");
      ellipsis.className = "pagination-ellipsis";
      ellipsis.textContent = "...";
      adminDom.paginationNumbers.appendChild(ellipsis);
    }

    const lastBtn = createPageButton(totalPages);
    adminDom.paginationNumbers.appendChild(lastBtn);
  }
}

// 페이지 버튼 생성
function createPageButton(pageNum) {
  const btn = document.createElement("button");
  btn.className = "pagination-btn";
  btn.textContent = pageNum;
  btn.addEventListener("click", () => goToPage(pageNum));
  return btn;
}

// 페이지 이동
function goToPage(pageNum) {
  currentPage = pageNum;
  renderResults();
  // 테이블 상단으로 스크롤
  adminDom.resultsTable.scrollIntoView({ behavior: "smooth", block: "start" });
}

// 시험 결과 삭제 (2번 확인) - 소프트 삭제 방식
async function deleteResult(resultId, userName, jobType, score) {
  // 1차 확인
  const firstConfirm = confirm(
    `다음 시험 결과를 삭제하시겠습니까?\n\n` +
    `사용자: ${userName}\n` +
    `직무: ${jobType}\n` +
    `점수: ${score}점\n\n` +
    `※ 웹페이지에서만 삭제되며, 데이터베이스에는 보관됩니다.`
  );

  if (!firstConfirm) {
    return; // 취소
  }

  // 2차 확인
  const secondConfirm = confirm(
    `정말로 삭제하시겠습니까?\n\n` +
    `한 번 더 확인합니다.\n` +
    `웹페이지 목록에서 제거됩니다.`
  );

  if (!secondConfirm) {
    return; // 취소
  }

  try {
    // Firestore에서 실제 삭제하지 않고 deleted 플래그만 추가
    await db.collection("exam_results").doc(resultId).update({
      deleted: true,
      deletedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    console.log("시험 결과 삭제 표시 완료:", resultId);
    alert("삭제되었습니다.\n(데이터베이스에는 보관됩니다)");

    // Firestore 재조회 없이 로컬 배열에서만 제거
    allResults = allResults.filter(r => r.id !== resultId);
    applyFilters();
  } catch (error) {
    console.error("삭제 실패:", error);
    alert("삭제 중 오류가 발생했습니다: " + error.message);
  }
}

// 엑셀로 내보내기
function exportToExcel() {
  if (filteredResults.length === 0) {
    alert("내보낼 데이터가 없습니다.");
    return;
  }

  // 데이터 준비
  const excelData = filteredResults.map((result, index) => ({
    "번호": index + 1,
    "소속": result.userStation || "-",
    "부서": result.userDepartment || "-",
    "사용자": result.userName,
    "이메일": result.userEmail,
    "날짜/시간": formatDate(result.timestamp),
    "점수": result.score,
    "정답": result.correct,
    "전체문항": result.total,
    "소요시간": formatTime(result.timeTaken || 0)
  }));

  // 워크북 생성
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(excelData);

  // 컬럼 너비 설정
  ws['!cols'] = [
    { wch: 6 },  // 번호
    { wch: 15 }, // 소속
    { wch: 20 }, // 부서
    { wch: 15 }, // 사용자
    { wch: 25 }, // 이메일
    { wch: 20 }, // 날짜/시간
    { wch: 8 },  // 점수
    { wch: 8 },  // 정답
    { wch: 10 }, // 전체문항
    { wch: 12 }  // 소요시간
  ];

  // 워크시트 추가
  XLSX.utils.book_append_sheet(wb, ws, "시험결과");

  // 파일명 생성 (기간 정보 포함)
  const today = new Date().toISOString().split('T')[0];
  let periodLabel = "";

  const startDate = startDatePicker ? startDatePicker.selectedDates[0] : null;
  const endDate = endDatePicker ? endDatePicker.selectedDates[0] : null;

  if (startDate || endDate) {
    const startStr = startDate ? startDate.toISOString().split('T')[0] : "";
    const endStr = endDate ? endDate.toISOString().split('T')[0] : "";
    periodLabel = `_${startStr}~${endStr}`;
  }

  const filename = `CBT시험결과${periodLabel}_${today}.xlsx`;

  // 파일 다운로드
  XLSX.writeFile(wb, filename);

  console.log(`엑셀 파일 내보내기 완료: ${filename}`);
}

// 공지사항 로드 (최대 20개)
async function loadNotifications() {
  try {
    const snapshot = await db.collection("notifications")
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

    adminDom.notifListAdmin.innerHTML = "";

    if (snapshot.empty) {
      adminDom.notifListAdmin.innerHTML = '<p style="color: #999; text-align: center;">등록된 공지사항이 없습니다.</p>';
      return;
    }

    snapshot.forEach(doc => {
      const data = doc.data();
      const notifDiv = document.createElement("div");
      notifDiv.style.cssText = "padding: 15px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 10px; background: " + (data.active ? "#f0f8ff" : "#f5f5f5") + ";";
      notifDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
          <div style="flex: 1;">
            <div style="font-weight: bold; color: #333; margin-bottom: 4px;">${data.title}</div>
            <div style="color: #666; font-size: 14px; margin-bottom: 4px;">${data.content}</div>
            <div style="font-size: 12px; color: #999;">
              ${data.createdAt ? new Date(data.createdAt.toDate()).toLocaleString('ko-KR') : ''}
              <span style="margin-left: 10px; padding: 2px 8px; background: ${data.active ? '#4caf50' : '#999'}; color: white; border-radius: 3px; font-size: 11px;">${data.active ? '활성' : '비활성'}</span>
            </div>
          </div>
          <div style="display: flex; gap: 5px;">
            <button class="toggle-notif-btn" data-id="${doc.id}" data-active="${data.active}" style="padding: 6px 12px; background: ${data.active ? '#ff9800' : '#4caf50'}; color: white; border: none; border-radius: 4px; font-size: 12px; cursor: pointer;">
              ${data.active ? '비활성화' : '활성화'}
            </button>
            <button class="delete-notif-btn" data-id="${doc.id}" style="padding: 6px 12px; background: #f44336; color: white; border: none; border-radius: 4px; font-size: 12px; cursor: pointer;">
              삭제
            </button>
          </div>
        </div>
      `;
      adminDom.notifListAdmin.appendChild(notifDiv);
    });

    // 토글 버튼 이벤트 리스너
    document.querySelectorAll(".toggle-notif-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.target.getAttribute("data-id");
        const currentActive = e.target.getAttribute("data-active") === "true";
        await toggleNotification(id, !currentActive);
      });
    });

    // 삭제 버튼 이벤트 리스너
    document.querySelectorAll(".delete-notif-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.target.getAttribute("data-id");
        await deleteNotification(id);
      });
    });
  } catch (error) {
    console.error("공지사항 로드 실패:", error);
  }
}

// 공지사항 추가
async function addNotification() {
  const title = adminDom.notifTitle.value.trim();
  const content = adminDom.notifContent.value.trim();

  if (!title || !content) {
    alert("제목과 내용을 모두 입력해주세요.");
    return;
  }

  try {
    await db.collection("notifications").add({
      title: title,
      content: content,
      active: true,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    adminDom.notifTitle.value = "";
    adminDom.notifContent.value = "";
    alert("공지사항이 등록되었습니다.");
    loadNotifications();
  } catch (error) {
    console.error("공지사항 등록 실패:", error);
    alert("공지사항 등록 중 오류가 발생했습니다.");
  }
}

// 공지사항 활성화/비활성화 토글
async function toggleNotification(id, active) {
  try {
    await db.collection("notifications").doc(id).update({ active: active });
    loadNotifications();
  } catch (error) {
    console.error("공지사항 상태 변경 실패:", error);
    alert("상태 변경 중 오류가 발생했습니다.");
  }
}

// 공지사항 삭제
async function deleteNotification(id) {
  if (!confirm("이 공지사항을 삭제하시겠습니까?")) {
    return;
  }

  try {
    await db.collection("notifications").doc(id).delete();
    alert("공지사항이 삭제되었습니다.");
    loadNotifications();
  } catch (error) {
    console.error("공지사항 삭제 실패:", error);
    alert("삭제 중 오류가 발생했습니다.");
  }
}

// 이벤트 리스너
adminDom.stationFilter.addEventListener("change", () => {
  // 소속 변경 시 부서 필터 업데이트
  updateDepartmentFilter();
  // 부서 필터 초기화
  adminDom.departmentFilter.value = "";
  applyFilters();
});
adminDom.departmentFilter.addEventListener("change", applyFilters);
adminDom.jobFilter.addEventListener("change", applyFilters);

// 사용자 이름 검색 (입력 시 바로 필터링, 디바운스 적용)
let userSearchTimeout = null;
adminDom.userSearchInput.addEventListener("input", () => {
  clearTimeout(userSearchTimeout);
  userSearchTimeout = setTimeout(() => {
    applyFilters();
  }, 300); // 300ms 디바운스
});

adminDom.searchBtn.addEventListener("click", () => {
  loadResults();
});

adminDom.refreshBtn.addEventListener("click", () => {
  userInfo = {}; // 유저 캐시 초기화
  loadResults();
});
adminDom.exportBtn.addEventListener("click", exportToExcel);
adminDom.addNotifBtn.addEventListener("click", addNotification);

// 페이지네이션 이벤트 리스너
adminDom.prevPageBtn.addEventListener("click", () => {
  if (currentPage > 1) {
    goToPage(currentPage - 1);
  }
});

adminDom.nextPageBtn.addEventListener("click", () => {
  const totalPages = Math.ceil(filteredResults.length / itemsPerPage);
  if (currentPage < totalPages) {
    goToPage(currentPage + 1);
  }
});

adminDom.pageSizeSelect.addEventListener("change", (e) => {
  itemsPerPage = parseInt(e.target.value);
  currentPage = 1; // 페이지 크기 변경 시 첫 페이지로
  renderResults();
});

// 관리자 권한 확인
// role: "superAdmin" - 최종관리자 (모든 기능)
// role: "admin" - 중간관리자 (읽기 + 다운로드만)
// isAdmin: true만 있는 경우 - 중간관리자로 처리 (역호환성)
async function checkAdminPermission(user) {
  try {
    console.log("권한 확인 중... User ID:", user.uid);
    const userDoc = await db.collection("users").doc(user.uid).get();

    if (!userDoc.exists) {
      console.log("사용자 문서가 존재하지 않습니다.");
      return { isAdmin: false, role: null, userName: user.email };
    }

    const userData = userDoc.data();
    console.log("사용자 데이터:", userData);
    console.log("isAdmin 값:", userData.isAdmin);
    console.log("role 값:", userData.role);

    // 관리자 여부 확인 (isAdmin이 불리언 true 또는 문자열 "true"인 경우 모두 허용)
    const isAdminField = userData.isAdmin === true || userData.isAdmin === "true";
    const isAdmin = isAdminField || userData.role === "superAdmin" || userData.role === "admin";

    // 권한 레벨 결정
    let role = null;
    if (userData.role === "superAdmin") {
      role = "superAdmin";
    } else if (userData.role === "admin" || isAdminField) {
      role = "admin";
    }

    console.log("관리자 여부:", isAdmin, "권한:", role);

    return { isAdmin, role, userName: userData.name || user.email };
  } catch (error) {
    console.error("권한 확인 오류:", error);
    return { isAdmin: false, role: null, userName: user.email };
  }
}

// 최종관리자 여부 확인
function isSuperAdmin() {
  return currentUserRole === "superAdmin";
}

// 권한에 따른 UI 업데이트
function updateUIByRole() {
  const isSuperAdminUser = isSuperAdmin();

  // 공지사항 관리 섹션
  const notifManagement = document.querySelector(".notification-management");
  if (notifManagement) {
    if (isSuperAdminUser) {
      notifManagement.style.display = "block";
    } else {
      notifManagement.style.display = "none";
    }
  }

  // 삭제 버튼들은 renderResults에서 처리
}

// 초기화
auth.onAuthStateChanged(async (user) => {
  if (user) {
    // 관리자 권한 확인 (유저 문서를 1번만 읽음)
    const permissionResult = await checkAdminPermission(user);

    if (!permissionResult.isAdmin) {
      alert("관리자 권한이 없습니다. 관리자 계정으로 로그인해주세요.");
      window.location.href = "index.html";
      return;
    }

    // 현재 사용자 권한 저장
    currentUserRole = permissionResult.role;
    console.log("현재 사용자 권한:", currentUserRole);

    // 사용자 이름 표시 (checkAdminPermission에서 이미 읽은 데이터 재사용)
    const userName = permissionResult.userName || user.email;
    const roleLabel = currentUserRole === "superAdmin" ? "최종관리자" : "관리자";
    adminDom.adminUser.textContent = `${roleLabel}: ${userName}님`;

    // 권한에 따른 UI 업데이트
    updateUIByRole();

    // 소속 드롭다운 미리 채우기
    initStationFilter();

    // 날짜 선택기 초기화
    initializeDatePickers();

    // 공지사항 로드 (최종관리자만)
    if (isSuperAdmin()) {
      loadNotifications();
    }

    // 자동 로드 없음 - 소속 선택 후 조회 버튼 클릭 시 로드
  } else {
    // 로그인하지 않은 경우 로그인 페이지로 리다이렉트
    window.location.href = "login.html";
  }
});
