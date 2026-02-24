let counter = 1;

const editor = document.getElementById("editor");
const addQBtn = document.getElementById("addQ");
const downloadBtn = document.getElementById("download");
const fileNameInput = document.getElementById("fileName");

function makeRow() {
  const row = document.createElement("div");
  row.className = "row";
  row.innerHTML = `
    <h3>문항 <span class="no">${counter}</span></h3>
    <div class="flex">
      <label style="flex:1">문항 ID: <input type="text" class="qid" placeholder="예: FIRE-${String(counter).padStart(4,'0')}"></label>
      <label style="flex:1">과목/주제: <input type="text" class="subject" placeholder="예: 산림화재 대응전술"></label>
      <label style="width:160px">정답 번호: <input type="number" class="answer" min="1" value="1"></label>
    </div>
    <label>문항 본문(지문)
      <textarea class="stem" placeholder="문항 본문을 붙여넣으세요."></textarea>
    </label>
    <div class="choices">
      <div class="choice-line"><span>①</span> <input type="text" class="c" placeholder="선지 1"></div>
      <div class="choice-line"><span>②</span> <input type="text" class="c" placeholder="선지 2"></div>
      <div class="choice-line"><span>③</span> <input type="text" class="c" placeholder="선지 3"></div>
      <div class="choice-line"><span>④</span> <input type="text" class="c" placeholder="선지 4"></div>
      <div class="choice-line"><span>⑤</span> <input type="text" class="c" placeholder="선지 5 (옵션)"></div>
    </div>
    <label>해설(선택) <textarea class="exp" placeholder="해설을 적으세요."></textarea></label>
    <label>근거/출처(선택) <input type="text" class="ref" placeholder="근거/출처를 적으세요."></label>
    <div class="bar">
      <button class="remove">삭제</button>
    </div>
  `;
  const removeBtn = row.querySelector(".remove");
  removeBtn.addEventListener("click", () => {
    row.remove();
    renumber();
  });
  editor.appendChild(row);
  counter += 1;
}

function renumber() {
  let n = 1;
  document.querySelectorAll(".row .no").forEach(el => el.textContent = n++);
}

addQBtn.addEventListener("click", makeRow);
makeRow();

function downloadJSON() {
  const arr = [];
  document.querySelectorAll(".row").forEach(row => {
    const id = row.querySelector(".qid").value.trim() || `FIRE-${Math.random().toString(36).slice(2,8)}`;
    const subject = row.querySelector(".subject").value.trim();
    const stem = row.querySelector(".stem").value.trim();
    const exps = row.querySelector(".exp").value.trim();
    const ref = row.querySelector(".ref").value.trim();
    const ans = parseInt(row.querySelector(".answer").value || "1", 10);

    const choices = [];
    row.querySelectorAll(".choices .c").forEach((inp, idx) => {
      const v = inp.value.trim();
      if (v) choices.push(`${"①②③④⑤"[idx]} ${v}`);
    });

    if (!stem || choices.length < 2) return; // skip incomplete

    arr.push({
      id, subject, type: "single", stem, choices,
      answer: [ans],
      explanation: exps,
      reference: ref
    });
  });

  if (!arr.length) {
    alert("문항이 없습니다. 문항을 추가해 주세요.");
    return;
  }

  const fileName = fileNameInput.value.trim() || "questions.json";
  const blob = new Blob([JSON.stringify(arr, null, 2)], { type: "application/json;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
}

downloadBtn.addEventListener("click", downloadJSON);
