# pdf_table_to_json.py — v5 (multi-subject batch processing)
import pdfplumber, json, regex as re, os, argparse, glob
from typing import List, Dict, Any
from pathlib import Path

CIRCLED = "①②③④⑤⑥⑦⑧⑨⑩"
C2N = {c: i + 1 for i, c in enumerate(CIRCLED)}
DEBUG = False

REMOVE_PHRASES = [
    "객관식 문제 출제 카드", "출제분야", "과목명", "문 제",
    "문제해설", "출제근거", "소속", "직위", "성명", "서명", "출제위원"
]

def clean(s: str) -> str:
    if not s:
        return ""
    s = s.replace("\u200b", "").replace("\ufeff", "")
    s = re.sub(r"\s+", " ", s).strip()
    for p in REMOVE_PHRASES:
        s = s.replace(p, "")
    return s

def split_choices_from_problem(t: str):
    t = clean(t)

    # ①②③④ … 패턴 우선
    pieces = re.split(r"(①|②|③|④|⑤|⑥|⑦|⑧|⑨|⑩)", t)
    if len(pieces) >= 3:
        stem = clean(pieces[0])
        choices = []
        for i in range(1, len(pieces), 2):
            mark = pieces[i]
            body = pieces[i + 1] if i + 1 < len(pieces) else ""
            body = re.split(r"(?:①|②|③|④|⑤|⑥|⑦|⑧|⑨|⑩)", body)[0]
            body = clean(body)
            if body:
                choices.append(f"{mark} {body}")
        return stem, choices

    # 보조: 1) 2) 3) 4) 또는 1. 2. …
    m = re.search(r"(\b1[.)])\s*", t)
    if m:
        stem = clean(t[:m.start()])
        rest = t[m.start():]
        chunks = re.split(r"\b(\d[.)])\s*", rest)
        choices = []
        for j in range(1, len(chunks), 2):
            numtok = chunks[j]
            body = clean(chunks[j + 1] if j + 1 < len(chunks) else "")
            try:
                n = int(re.findall(r"\d", numtok)[0])
                mark = CIRCLED[n - 1] if 1 <= n <= 10 else numtok
            except Exception:
                mark = numtok
            body = re.split(r"\b\d[.)]\s*", body)[0]
            body = clean(body)
            if body:
                choices.append(f"{mark} {body}")
        return stem, choices

    return t, []

def text_fallback(page_text: str) -> List[Dict[str, Any]]:
    """페이지 텍스트에서 ①~④ 패턴 덩어리를 직접 찾아 문항 생성"""
    out = []
    t = clean(page_text)

    # ① … ② … ③ … (④ …) 최소 3지선다 이상만 인정
    blocks = re.split(r"(?=\s*①)", t)
    for b in blocks:
        if b.count("①") + b.count("②") + b.count("③") < 3:
            continue
        if "①" in b:
            b = "①" + b.split("①", 1)[1]

        # 느슨한 분해
        parts = re.split(r"(①|②|③|④|⑤)", b)
        if len(parts) < 6:
            continue
        chs = []
        # parts = [pre, '①', after1, '②', after2, '③', after3, '④', after4, ...]
        pre = clean(parts[0])
        stem = pre or ""
        for i in range(1, len(parts), 2):
            mark = parts[i]
            body = clean(parts[i + 1] if i + 1 < len(parts) else "")
            body = re.split(r"(?:①|②|③|④|⑤)", body)[0]
            if body:
                chs.append(f"{mark} {body}")
        if len(chs) >= 3:
            out.append({"stem": stem, "choices": chs[:5]})
    return out

def parse_pdf_tables(pdf_path: str, subject_hint: str = "", start_page: int = 1, end_page: int = 0):
    items: List[Dict[str, Any]] = []
    seen_stems = set()

    def add_item(stem, choices, ans):
        # 꼬리의 '정답 …' 제거
        stem = re.split(r"정\s*답\s*[:：]?\s*[①②③④⑤⑥⑦⑧⑨⑩]?\s*\d?", stem)[0].strip()
        if not stem or stem in seen_stems:
            return False
        if re.fullmatch(r"\d+", stem):
            return False
        if len(choices) < 1:
            return False

        q = {
            "id": f"Q-{len(items) + 1:04d}",
            "subject": subject_hint,
            "type": "single",
            "stem": stem,
            "choices": choices[:5],
            "answer": [ans] if ans else [],
            "explanation": "",
            "reference": os.path.basename(pdf_path),
        }
        items.append(q)
        seen_stems.add(stem)
        return True

    with pdfplumber.open(pdf_path) as pdf:
        total = len(pdf.pages)
        s = max(1, start_page)
        e = min(end_page or total, total)

        for pidx in range(s - 1, e):
            page = pdf.pages[pidx]
            added_before = len(items)

            # 1) 테이블 추출 (감도 조금 높임)
            try:
                tables = page.extract_tables({
                    "vertical_strategy": "lines",
                    "horizontal_strategy": "lines",
                    "intersection_tolerance": 7,
                    "snap_tolerance": 4,
                    "join_tolerance": 4,
                    "edge_min_length": 40,
                })
            except Exception:
                tables = []

            for tbl in tables:
                for row in tbl:
                    if not row:
                        continue
                    cells = [clean(c) for c in row]

                    # 헤더/합계 등 제거
                    if any(h in "".join(cells) for h in ["구분", "과목명", "문제", "정답", "정 답", "비 고", "비고"]):
                        continue
                    if len(cells) < 3:
                        if DEBUG:
                            print(f"[p{pidx + 1}] skip: <3 cols")
                        continue

                    # 핵심: 문제·보기가 여러 칸에 흩어져 있음 → 3열~(마지막-1)열 합치기
                    if len(cells) >= 5:
                        problem = " ".join(cells[2:-1])
                        answer_cell = cells[-1]
                    else:
                        problem = cells[2] if len(cells) >= 3 else ""
                        answer_cell = cells[3] if len(cells) >= 4 else ""

                    stem, choices = split_choices_from_problem(problem)

                    # 정답 추출 (정답 칸 우선, 없으면 본문 스캔)
                    ans = None
                    m = re.search(r"[①②③④⑤⑥⑦⑧⑨⑩]", answer_cell)
                    if m:
                        ans = C2N[m.group(0)]
                    else:
                        m2 = re.search(r"정\s*답\s*[:：]?\s*([①②③④⑤⑥⑦⑧⑨⑩]|\d)", problem)
                        if m2:
                            ch = m2.group(1)
                            ans = C2N.get(ch, int(ch) if ch.isdigit() else None)
                        if not ans:
                            m3 = re.search(r"([①②③④⑤⑥⑦⑧⑨⑩])\s*$", " ".join(cells))
                        if m3:
                            ans = C2N.get(m3.group(1).strip())

                    ok = add_item(stem, choices, ans)
                    if DEBUG and not ok:
                        print(f"[p{pidx + 1}] filtered row: stem='{stem[:25]}' choices={len(choices)} ans={ans}")

            # 2) 테이블로 못 잡았으면 텍스트 백업
            if len(items) == added_before:
                t = page.extract_text() or ""
                fb = text_fallback(t)
                for b in fb:
                    add_item(b["stem"] or "", b["choices"], None)
                if DEBUG:
                    print(f"[p{pidx + 1}] table->0, fallback added {len(items) - added_before}")

    return items

def batch_process_pdfs(pdf_dir: str, output_dir: str, start_page: int = 2, end_page: int = 0):
    """여러 과목 PDF를 일괄 처리하여 각각 JSON으로 변환"""
    # 과목별 매핑
    subject_mapping = {
        '구급': '구급',
        '구조': '구조', 
        '소방시설': '소방시설',
        '안전관리': '안전관리',
        '장비': '장비',
        '화재': '화재'
    }
    
    pdf_files = glob.glob(os.path.join(pdf_dir, "*.pdf"))
    os.makedirs(output_dir, exist_ok=True)
    
    results = {}
    
    for pdf_path in pdf_files:
        filename = Path(pdf_path).stem.lower()
        
        # 파일명에서 과목 식별
        subject = ""
        for key, value in subject_mapping.items():
            if key in filename:
                subject = value
                break
        
        if not subject:
            # 파일명에서 과목을 찾지 못한 경우 기본값 사용
            subject = "기타"
        
        print(f"Processing {pdf_path} -> subject: {subject}")
        
        try:
            data = parse_pdf_tables(
                pdf_path,
                subject_hint=subject,
                start_page=start_page,
                end_page=end_page,
            )
            
            output_filename = f"{filename}.json"
            output_path = os.path.join(output_dir, output_filename)
            
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            results[subject] = {
                'pdf_file': pdf_path,
                'json_file': output_path,
                'question_count': len(data)
            }
            
            print(f"[OK] {subject}: {len(data)} questions -> {output_path}")
            
        except Exception as e:
            print(f"[ERROR] Error processing {pdf_path}: {e}")
            results[subject] = {'error': str(e)}
    
    return results

def merge_all_json_files(json_dir: str, output_file: str):
    """모든 JSON 파일을 하나로 병합"""
    all_questions = []
    json_files = glob.glob(os.path.join(json_dir, "*.json"))
    
    for json_file in sorted(json_files):
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                all_questions.extend(data)
                print(f"Loaded {len(data)} questions from {json_file}")
        except Exception as e:
            print(f"Error loading {json_file}: {e}")
    
    # ID 재생성 (전체 순서대로)
    for i, q in enumerate(all_questions, 1):
        q['id'] = f"Q-{i:04d}"
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_questions, f, ensure_ascii=False, indent=2)
    
    print(f"\n[OK] Merged {len(all_questions)} questions -> {output_file}")
    return len(all_questions)

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--single", help="단일 PDF 처리 (기존 방식)")
    ap.add_argument("--batch", help="PDF 폴더 일괄 처리")
    ap.add_argument("--output", default="./output", help="출력 폴더")
    ap.add_argument("--merge", help="JSON 파일들을 병합할 출력 파일")
    ap.add_argument("--subject", default="", help="단일 PDF 처리시 과목명")
    ap.add_argument("--start", type=int, default=2, help="시작 페이지(1부터, 기본=2)")
    ap.add_argument("--end", type=int, default=0, help="끝 페이지(0=마지막)")
    ap.add_argument("--debug", action="store_true")
    args = ap.parse_args()
    
    if args.debug:
        DEBUG = True
    
    if args.single:
        # 기존 단일 파일 처리
        if not args.output.endswith('.json'):
            args.output += '.json'
        
        data = parse_pdf_tables(
            args.single,
            subject_hint=args.subject,
            start_page=args.start,
            end_page=args.end,
        )
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Wrote {len(data)} questions -> {args.output}")
    
    elif args.batch:
        # 배치 처리
        results = batch_process_pdfs(
            args.batch,
            args.output,
            start_page=args.start,
            end_page=args.end
        )
        
        # 결과 요약
        print("\n=== Processing Summary ===")
        total_questions = 0
        for subject, info in results.items():
            if 'error' in info:
                print(f"{subject}: ERROR - {info['error']}")
            else:
                count = info['question_count']
                total_questions += count
                print(f"{subject}: {count} questions")
        print(f"Total: {total_questions} questions")
        
        # 자동 병합
        if args.merge:
            merge_all_json_files(args.output, args.merge)
    
    elif args.merge:
        # 병합만 수행
        if os.path.isdir(args.output):
            merge_all_json_files(args.output, args.merge)
        else:
            print("Error: --output should be a directory for merge operation")
    
    else:
        print("Usage:")
        print("  Single file: python pdf_table_to_json.py --single input.pdf --output output.json")
        print("  Batch process: python pdf_table_to_json.py --batch ./pdfs --output ./json_output")
        print("  Merge JSONs: python pdf_table_to_json.py --merge combined.json --output ./json_output")
        print("  Batch + Merge: python pdf_table_to_json.py --batch ./pdfs --output ./json_output --merge all_questions.json")
