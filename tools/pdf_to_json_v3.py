# pdf_to_json_v3.py  (텍스트 PDF 전용 개선판)
import pdfplumber, json, regex as re, sys, os, argparse

CIRCLED = "①②③④⑤⑥⑦⑧⑨⑩"
CHOICE_RE = re.compile(rf"^\s*([{CIRCLED}]|\d+[.)])\s*(.+)")
STEM_ANCHOR = re.compile(r"(?:^|\n)\s*문\s*제\b", re.DOTALL)
ANSWER_RE = re.compile(r"정\s*답\s*[:：]?\s*([0-9" + CIRCLED + r"])")
REF_RE = re.compile(r"^[❖◆]\s*\(?(근거|출처)\)?\s*[:：]?\s*(.+)")
EXP_RE = re.compile(r"^[❖◆]\s*\(?해설\)?\s*[:：]?\s*(.+)")
HEADER_TRASH = re.compile(r"(직장훈련\s*성과\s*진단\s*문제은행.*|출제카드.*|공개.*)")
PAGE_NO = re.compile(r"^\s*\d+\s*/\s*\d+\s*$")

def circled_to_num(ch: str):
    if ch and ch in CIRCLED: return CIRCLED.index(ch) + 1
    try: return int(ch)
    except: return None

def clean_line(s: str) -> str:
    # 잡문자/제어문자 제거 + 공백 정리
    s = s.replace("\u200b", "").replace("\ufeff", "")
    s = s.replace("ㄴ", "")  # 간혹 끼는 잡문자
    s = re.sub(r"\s+", " ", s).strip()
    return s

def normalize_lines(lines):
    out = []
    for raw in lines:
        s = clean_line(raw)
        if not s: continue
        if HEADER_TRASH.search(s): continue
        if PAGE_NO.match(s): continue
        # 이전 줄이 하이픈으로 끊긴 경우 붙이기
        if out and out[-1].endswith("-"):
            out[-1] = out[-1][:-1] + s
        else:
            out.append(s)
    return out

def extract_blocks(text):
    """텍스트에서 (stem, choices, answer, ref, exp) 블록 단위 추출"""
    blocks = []
    # '문 제'가 나오기 전은 버림
    if not STEM_ANCHOR.search(text):
        return blocks

    # 느슨하게 문항 단위로 분할 (다음 '문 제' 직전까지)
    parts = re.split(r"(?:^|\n)\s*문\s*제\b", text)
    for part in parts:
        c = part.strip()
        if not c: continue
        lines = [l for l in c.splitlines()]
        lines = normalize_lines(lines)
        if not lines: continue

        stem_lines, choices, ref_lines, exp_lines = [], [], [], []
        answer_num, in_choices = None, False
        buffer_choice = None

        for line in lines:
            # 정답
            m = ANSWER_RE.search(line)
            if m:
                answer_num = circled_to_num(m.group(1)[0])
                continue
            # 근거/해설
            mref = REF_RE.match(line)
            if mref:
                ref_lines.append(mref.group(2))
                continue
            mexp = EXP_RE.match(line)
            if mexp:
                exp_lines.append(mexp.group(1))
                continue
            # 선지
            m = CHOICE_RE.match(line)
            if m:
                if buffer_choice:
                    choices.append(buffer_choice)
                    buffer_choice = None
                num, txt = m.groups()
                # 1. / 1) 같은 표기도 ①로 치환
                prefix = num if num in CIRCLED else None
                if prefix is None and re.match(r"^\d+[.)]$", num):
                    n = int(re.findall(r"\d+", num)[0])
                    prefix = CIRCLED[n-1] if 1 <= n <= len(CIRCLED) else f"{n}."
                buffer_choice = f"{prefix} {txt}".strip()
                in_choices = True
                continue
            # 선지 진행 중이면 줄 이어붙이기
            if in_choices:
                if buffer_choice:
                    buffer_choice += " " + line.strip()
            else:
                stem_lines.append(line)

        if buffer_choice:
            choices.append(buffer_choice)

        stem_txt = clean_line(" ".join(stem_lines))
        ref_txt = clean_line(" ".join(ref_lines)) if ref_lines else ""
        exp_txt = clean_line(" ".join(exp_lines)) if exp_lines else ""
        if stem_txt and choices:
            blocks.append((stem_txt, choices, answer_num, ref_txt, exp_txt))

    return blocks

def parse_pdf_to_items(path, start_page=1, end_page=None, subject_hint=""):
    items = []
    with pdfplumber.open(path) as pdf:
        total = len(pdf.pages)
        s = max(1, start_page)
        e = min(end_page or total, total)
        for i in range(s-1, e):
            t = pdf.pages[i].extract_text() or ""
            if not t.strip():
                continue
            for stem, choices, ans, ref, exp in extract_blocks(t):
                items.append({
                    "id": f"Q-{len(items)+1:04d}",
                    "subject": subject_hint,
                    "type": "single",
                    "stem": stem,
                    "choices": choices,
                    "answer": [ans] if ans else [],
                    "explanation": exp,
                    "reference": ref or os.path.basename(path)
                })
    return items

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("src", help="입력 PDF 경로")
    ap.add_argument("dst", help="출력 JSON 경로")
    ap.add_argument("--start", type=int, default=2, help="시작 페이지(1부터, 기본=2: 목차 건너뜀)")
    ap.add_argument("--end", type=int, default=0, help="끝 페이지(0이면 마지막)")
    ap.add_argument("--subject", type=str, default="", help="subject 필드 힌트")
    args = ap.parse_args()

    data = parse_pdf_to_items(
        args.src,
        start_page=args.start,
        end_page=(args.end or None),
        subject_hint=args.subject,
    )
    with open(args.dst, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Wrote {len(data)} questions -> {args.dst}")
