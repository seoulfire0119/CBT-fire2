from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import copy

doc = Document()

# 페이지 여백 설정
section = doc.sections[0]
section.top_margin = Cm(2.5)
section.bottom_margin = Cm(2.5)
section.left_margin = Cm(3.0)
section.right_margin = Cm(3.0)

# 기본 폰트 설정
style = doc.styles['Normal']
style.font.name = '맑은 고딕'
style.font.size = Pt(10)
style.element.rPr.rFonts.set(qn('w:eastAsia'), '맑은 고딕')

def set_font(run, name='맑은 고딕', size=10, bold=False, color=None):
    run.font.name = name
    run.font.size = Pt(size)
    run.font.bold = bold
    run._r.rPr.rFonts.set(qn('w:eastAsia'), name)
    if color:
        run.font.color.rgb = RGBColor(*color)

def add_heading(doc, text, level=1, size=16, color=(0,0,0), bold=True, align=WD_ALIGN_PARAGRAPH.LEFT, space_before=12, space_after=6):
    p = doc.add_paragraph()
    p.alignment = align
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(space_after)
    run = p.add_run(text)
    set_font(run, size=size, bold=bold, color=color)
    return p

def add_para(doc, text, size=10, indent=0, space_after=4, bold=False, color=None):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(space_after)
    if indent:
        p.paragraph_format.left_indent = Cm(indent)
    run = p.add_run(text)
    set_font(run, size=size, bold=bold, color=color)
    return p

def add_table(doc, headers, rows, col_widths=None):
    table = doc.add_table(rows=1+len(rows), cols=len(headers))
    table.style = 'Table Grid'
    table.alignment = WD_TABLE_ALIGNMENT.CENTER

    # 헤더
    hdr = table.rows[0]
    for i, h in enumerate(headers):
        cell = hdr.cells[i]
        cell.text = h
        cell.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = cell.paragraphs[0].runs[0]
        set_font(run, size=9, bold=True, color=(255,255,255))
        # 헤더 배경색
        tc = cell._tc
        tcPr = tc.get_or_add_tcPr()
        shd = OxmlElement('w:shd')
        shd.set(qn('w:val'), 'clear')
        shd.set(qn('w:color'), 'auto')
        shd.set(qn('w:fill'), '1F4E79')
        tcPr.append(shd)

    # 데이터 행
    for ri, row_data in enumerate(rows):
        row = table.rows[ri+1]
        bg = 'EBF3FB' if ri % 2 == 0 else 'FFFFFF'
        for ci, val in enumerate(row_data):
            cell = row.cells[ci]
            cell.text = str(val)
            cell.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER if ci > 0 else WD_ALIGN_PARAGRAPH.LEFT
            run = cell.paragraphs[0].runs[0]
            set_font(run, size=9)
            tc = cell._tc
            tcPr = tc.get_or_add_tcPr()
            shd = OxmlElement('w:shd')
            shd.set(qn('w:val'), 'clear')
            shd.set(qn('w:color'), 'auto')
            shd.set(qn('w:fill'), bg)
            tcPr.append(shd)

    # 열 너비
    if col_widths:
        for i, width in enumerate(col_widths):
            for row in table.rows:
                row.cells[i].width = Cm(width)
    return table

# ─── 표지 ───────────────────────────────────────────────────────────────────
doc.add_paragraph()
doc.add_paragraph()
doc.add_paragraph()

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run('소방 직장훈련 CBT 평가시스템')
set_font(run, size=22, bold=True, color=(31,78,121))

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run('타시도 확산 제안서')
set_font(run, size=22, bold=True, color=(31,78,121))

doc.add_paragraph()
doc.add_paragraph()

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run('서울소방재난본부')
set_font(run, size=13, bold=True)

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run('2026년 4월')
set_font(run, size=12)

doc.add_page_break()

# ─── 1. 사업 개요 ─────────────────────────────────────────────────────────────
add_heading(doc, '1. 사업 개요', size=14, color=(31,78,121))

add_table(doc,
    ['항목', '내용'],
    [
        ['사업명', '소방 직장훈련 CBT 평가시스템 전국 확산'],
        ['대상', '전국 소방본부 및 소방서 소속 소방공무원'],
        ['플랫폼', '웹 기반 (PC·모바일 호환), Firebase 클라우드'],
        ['시범 운영', '서울소방재난본부 (2026. 3.)'],
        ['목표', '직장훈련 평가의 전국 표준화 및 행정 효율화'],
    ],
    col_widths=[4, 11]
)

# ─── 2. 추진 배경 ────────────────────────────────────────────────────────────
add_heading(doc, '2. 추진 배경', size=14, color=(31,78,121))

add_para(doc, '소방공무원 직장훈련은 소방청 지침에 따라 연 1회 이상 평가를 실시해야 한다. 그러나 각 소방본부별로 자체 방식(구글 폼, 종이시험 등)으로 운영되어 평가 신뢰성, 행정 효율, 데이터 관리 측면에서 한계가 있었다.', space_after=6)

add_para(doc, '서울소방재난본부는 2026년 3월, 자체 개발한 웹 기반 CBT(Computer Based Test) 시스템을 통해 전 소방서 동시 평가를 실시하였으며, 기존 대비 업무 효율 약 3배 향상이라는 유의미한 성과를 거두었다.', space_after=6)

add_para(doc, '이에 본 시스템을 타시도 소방본부에 확산하고, 나아가 소방청 주도의 전국 표준 플랫폼으로 발전시키고자 본 제안서를 제출한다.', space_after=6)

# ─── 3. 기존 방식 문제점 ──────────────────────────────────────────────────────
add_heading(doc, '3. 기존 방식(구글 폼)의 문제점', size=14, color=(31,78,121))

add_para(doc, '■ 채점 업무 과중', bold=True, space_after=3)
add_para(doc, '• 직렬별(지휘·진압·구조·구급·시설·장비 등 6개 직렬)로 각각 별도 채점 필요', indent=0.5, space_after=2)
add_para(doc, '• 단순 반복 작업이 최소 6배 발생하며, 채점 완료 후 오류 제보 시 전체 재채점 반복', indent=0.5, space_after=6)

add_para(doc, '■ 채점 오류 빈발', bold=True, space_after=3)
add_para(doc, '• 구글 폼 특성상 복수 정답·조건부 채점 불가', indent=0.5, space_after=2)
add_para(doc, '• 문제 오류 발견 시 응시자 전체 데이터 수동 수정 필요', indent=0.5, space_after=2)
add_para(doc, '• 실제 사례: 구급대원 약 2,000명 분 수동 재처리 발생', indent=0.5, size=10, bold=True, color=(192,0,0), space_after=6)

add_para(doc, '■ 데이터 관리 부재', bold=True, space_after=3)
add_para(doc, '• 응시 이력, 점수 추이, 소방서별 현황 등 통계 조회 불가', indent=0.5, space_after=2)
add_para(doc, '• 시험 결과를 엑셀로 일일이 정리해야 하는 행정 부담', indent=0.5, space_after=6)

add_para(doc, '■ 공정성 문제', bold=True, space_after=3)
add_para(doc, '• 링크 유출 시 문제 사전 공유 가능, 시간 제한·무작위 출제 기능 없음', indent=0.5, space_after=6)

# ─── 4. 시스템 개요 ──────────────────────────────────────────────────────────
add_heading(doc, '4. 시스템 개요 및 주요 기능', size=14, color=(31,78,121))

add_para(doc, '별도 앱 설치 없이 웹 브라우저로 접속 가능 (PC·스마트폰 모두 지원)', space_after=8)

add_table(doc,
    ['구분', '기능'],
    [
        ['응시자', '직렬별 맞춤 문제 출제, 20분 제한, 자동 채점, 즉시 결과 확인'],
        ['문제 관리', '직렬별 문제은행, 무작위 출제, 문제 추가·수정·삭제'],
        ['관리자', '응시 현황 실시간 조회, 소방서·부서·직렬별 통계, 엑셀 내보내기'],
        ['공지사항', '관리자 공지 등록·수정·삭제 (응시자 메인화면 노출)'],
        ['보안', '계정 기반 접근 제어, Firestore 보안 규칙 적용'],
    ],
    col_widths=[3.5, 11.5]
)

doc.add_paragraph()
add_heading(doc, '▶ 직렬별 출제 구성', size=11, color=(31,78,121), space_before=6, space_after=4)

add_table(doc,
    ['직렬', '출제 과목 및 문항 수'],
    [
        ['지휘대', '안전관리 10문제 + 소방시설 10문제'],
        ['진압대원', '화재 10문제 + 소방시설 5문제 + 안전관리 5문제'],
        ['구조대원', '구조 10문제 + 소방시설 5문제 + 안전관리 5문제'],
        ['구급대원(자격자)', '구급 15문제 + 안전관리 5문제'],
        ['구급대원(교육이수자)', '구급 15문제 + 안전관리 5문제'],
        ['기동대원', '장비 10문제 + 안전관리 10문제'],
    ],
    col_widths=[5, 10]
)

# ─── 5. 시범 운영 성과 ────────────────────────────────────────────────────────
doc.add_page_break()
add_heading(doc, '5. 서울소방 시범 운영 성과', size=14, color=(31,78,121))

add_para(doc, '• 운영 기간: 2026. 3. 3. ~ 3. 27. (25일간, 전 소방서 자율 일정)', indent=0.3, space_after=2)
add_para(doc, '• 총 응시 인원: 약 5,300명', indent=0.3, space_after=8)

add_table(doc,
    ['지표', '내용'],
    [
        ['총 응시 인원', '약 5,300명'],
        ['오류 인원', '30명 (오류율 0.57%)'],
        ['오류 원인', '회원가입 시 이름·이메일 입력 오류 → 시스템 개선 완료'],
        ['업무 효율', '기존 구글 폼 대비 체감 약 3배 향상'],
        ['자동 채점', '6개 직렬 동시·즉시 채점 (수동 채점 0건)'],
        ['재채점 요청', '0건 (기존 방식: 다수 발생)'],
    ],
    col_widths=[4.5, 10.5]
)

doc.add_paragraph()
add_heading(doc, '▶ 한계점 및 개선 현황', size=11, color=(31,78,121), space_before=6, space_after=4)

add_table(doc,
    ['한계점', '개선 현황'],
    [
        ['회원가입 입력 오류', '입력 검증 로직 강화 완료'],
        ['Firebase 무료 한도 초과 (25일 중 4일)', '유료 전환 계획 수립 중'],
        ['문제 오류 발생 시 일괄 수정 불가', '관리자 문제 수정 기능 개발 예정'],
    ],
    col_widths=[7, 8]
)

# ─── 6. 소방청 연계 방안 ──────────────────────────────────────────────────────
add_heading(doc, '6. 소방청 연계 및 공식화 방안', size=14, color=(31,78,121))

add_para(doc, '현재 본 시스템은 서울소방재난본부 내부적으로 개발·운영 중이며, 소방청 공식 승인 또는 등록된 사이트가 아닌 상태이다.', space_after=8)

add_para(doc, '■ 소방청 공식화를 위한 단계별 요청사항', bold=True, space_after=4)

add_table(doc,
    ['단계', '내용'],
    [
        ['1단계\n서울본부 공식 승인', '• 본부 차원의 정식 도입 결재 및 공문 발행\n• 서울소방 공식 사이트 또는 인트라넷에 링크 등록'],
        ['2단계\n소방청 등재', '• 소방청 직장훈련 지침 내 공식 평가 도구로 명시\n• 타 소방본부 도입 시 소방청 승인 플랫폼으로 활용 근거 마련'],
        ['3단계\n보안 검토', '• 소방공무원 개인정보 처리에 대한 보안 감사\n• 필요 시 국가 클라우드(G-Cloud) 전환 검토'],
    ],
    col_widths=[3.5, 11.5]
)

# ─── 7. 타시도 확산 계획 ──────────────────────────────────────────────────────
add_heading(doc, '7. 타시도 확산 계획', size=14, color=(31,78,121))

add_para(doc, '■ 확산 방식 (2가지 안)', bold=True, space_after=4)

add_table(doc,
    ['구분', '1안: 서울 시스템 공동 활용', '2안: 전국 단일 플랫폼 구축 (권장)'],
    [
        ['개요', '서울 시스템에 타시도 계정 추가', '소방청 주관 전국 통합 시스템 구축'],
        ['장점', '별도 구축 비용 없음\n빠른 도입 가능', '시도별 독립 운영\n소방청 전국 현황 통합 조회'],
        ['단점', '문제은행 혼재 우려', '구축 기간 및 예산 소요'],
    ],
    col_widths=[2.5, 6.5, 6]
)

doc.add_paragraph()
add_para(doc, '■ 단계별 확산 계획', bold=True, space_after=4)

add_table(doc,
    ['단계', '시기', '내용'],
    [
        ['1단계', '2026 하반기', '서울 + 2~3개 인접 시도 시범 확산 (경기, 인천 등)'],
        ['2단계', '2027 상반기', '전국 18개 소방본부 확산 / 소방청 공식 플랫폼 등재'],
        ['3단계', '2027 하반기', '문제은행 전국 표준화 / 소방청 직장훈련 지침 개정 반영'],
    ],
    col_widths=[2, 3.5, 9.5]
)

# ─── 8. 소요 예산 ────────────────────────────────────────────────────────────
doc.add_page_break()
add_heading(doc, '8. 소요 예산', size=14, color=(31,78,121))

add_para(doc, '■ 현재 운영 비용 (서울, 연간)', bold=True, space_after=4)

add_table(doc,
    ['항목', '비용', '비고'],
    [
        ['Firebase Hosting', '무료', '현재 무료 플랜'],
        ['Firestore DB', '유료 전환 필요', '5,300명 응시 시 4일 한도 초과'],
        ['도메인', '무료 (web.app)', '공식 도메인 필요 시 별도'],
        ['소계', '약 0~10만원/년', '현재 기준'],
    ],
    col_widths=[5, 4, 6]
)

add_para(doc, '※ Firebase 유료 전환 시 5,300명 기준 월 약 2~5만원 예상', indent=0.3, space_after=10, size=9)

add_para(doc, '■ 전국 확산 시 예산 (추정)', bold=True, space_after=4)

add_table(doc,
    ['항목', '금액', '비고'],
    [
        ['시스템 고도화 개발', '2,000만원', '전국 다중 시도 지원, 보안 강화, 문제 수정 기능 등'],
        ['서버 인프라 (연간)', '500만원', 'Firebase Blaze 또는 G-Cloud 전환'],
        ['문제은행 표준화', '1,000만원', '전국 공통 문제은행 구축 및 검수'],
        ['운영·유지보수 (연간)', '500만원', '기술 지원, 업데이트'],
        ['합계', '약 4,000만원', '1회성 구축 + 연 1,000만원 운영'],
    ],
    col_widths=[4.5, 3, 7.5]
)

add_para(doc, '※ 구글 폼 기반 수기 채점 대비 행정 인력 절감 효과 감안 시 투자 대비 효과 매우 높음', indent=0.3, size=9, space_after=6)

# ─── 9. 기대 효과 ────────────────────────────────────────────────────────────
add_heading(doc, '9. 기대 효과', size=14, color=(31,78,121))

add_table(doc,
    ['구분', '기존(구글 폼)', 'CBT 시스템'],
    [
        ['채점 소요 시간', '직렬별 반복 × 오류 재작업', '자동 (0분)'],
        ['오류 재처리', '수천 명 수동 수정', '즉시 일괄 수정'],
        ['통계 집계', '수동 엑셀 작업', '실시간 자동'],
        ['문제 공정성', '사전 공유 가능', '무작위 출제로 방지'],
        ['전국 현황 파악', '불가', '소방청 통합 조회 가능'],
    ],
    col_widths=[3.5, 6, 5.5]
)

# ─── 10. 추진 일정 ───────────────────────────────────────────────────────────
add_heading(doc, '10. 추진 일정', size=14, color=(31,78,121))

add_table(doc,
    ['시기', '내용'],
    [
        ['2026. 4~5월', '서울소방본부 공식 승인 및 내부 결재'],
        ['2026. 5~6월', '소방청 보고 및 확산 협의'],
        ['2026. 6~8월', '시스템 고도화 개발 (문제 수정 기능, 다시도 지원)'],
        ['2026. 9~10월', '수도권 2~3개 시도 시범 확산'],
        ['2026. 11월', '시범 운영 결과 보고'],
        ['2027. 상반기', '전국 18개 소방본부 확산'],
        ['2027. 하반기', '소방청 직장훈련 지침 개정 반영'],
    ],
    col_widths=[4, 11]
)

# ─── 붙임 ────────────────────────────────────────────────────────────────────
doc.add_paragraph()
add_para(doc, '【붙임】', bold=True, space_after=3)
add_para(doc, '1. 서울소방 CBT 시스템 화면 캡처', indent=0.5, space_after=2)
add_para(doc, '2. 시범 운영 결과 통계 (2026. 3. 3. ~ 3. 27.)', indent=0.5, space_after=2)
add_para(doc, '3. 기능 시연 링크: https://seoul-dc4d7.web.app', indent=0.5, space_after=2)

# 저장
output_path = r'D:\dev\CBT-fire2\기타\소방직장훈련_CBT_타시도확산_제안서.docx'
doc.save(output_path)
print(f'저장 완료: {output_path}')
