import pdfplumber, json, regex as re, sys, os

def parse_pdf(path):
    items = []
    circled = "①②③④⑤⑥⑦⑧⑨⑩"
    choice_pat = re.compile(rf"^[{circled}]\s*.+")
    stem_pat = re.compile(r"문\s*제\s*(.+)", re.DOTALL)
    answer_pat = re.compile(r"정\s*답\s*[:：]?\s*([0-9{circled}])")

    def circled_to_num(ch):
        if ch in circled: return circled.index(ch) + 1
        try: return int(ch)
        except: return None

    with pdfplumber.open(path) as pdf:
        for p in pdf.pages:
            text = p.extract_text() or ""
            lines = [l.rstrip() for l in text.splitlines() if l.strip()]

            # 1) stem
            stem = ""
            for i,l in enumerate(lines):
                m = stem_pat.search(l)
                if m:
                    stem = m.group(1).strip()
                    start = i+1
                    break
            if not stem: 
                continue

            # 2) choices
            choices = []
            for l in lines[start:]:
                if choice_pat.match(l):
                    choices.append(l.strip())
                elif "정답" in l:
                    break

            # 3) answer
            ans = None
            for l in lines:
                m = answer_pat.search(l)
                if m:
                    ans = circled_to_num(m.group(1)[0])
                    break

            if stem and choices:
                items.append({
                    "id": f"Q-{len(items)+1:04d}",
                    "subject": "",
                    "type": "single",
                    "stem": stem,
                    "choices": choices,
                    "answer": [ans] if ans else [],
                    "explanation": "",
                    "reference": os.path.basename(path)
                })
    return items

if __name__ == "__main__":
    pdf_path = sys.argv[1]
    out_path = sys.argv[2]
    data = parse_pdf(pdf_path)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Wrote {len(data)} questions -> {out_path}")
