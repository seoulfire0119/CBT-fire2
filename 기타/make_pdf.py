import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import matplotlib.font_manager as fm
import numpy as np
import base64, io, os

# ── 한글 폰트 설정 ──────────────────────────────────────────────
font_candidates = [
    'Malgun Gothic', '맑은 고딕', 'NanumGothic', 'AppleGothic',
    'NanumBarunGothic', 'Gulim', '굴림'
]
font_name = None
for f in font_candidates:
    try:
        fm.findfont(fm.FontProperties(family=f), fallback_to_default=False)
        font_name = f
        break
    except:
        continue
if font_name:
    plt.rcParams['font.family'] = font_name
plt.rcParams['axes.unicode_minus'] = False

def fig_to_base64(fig):
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=150, bbox_inches='tight',
                facecolor='white')
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode()

# ── 차트 1: 결과 처리 소요 비교 ────────────────────────────────
def chart_processing_time():
    fig, ax = plt.subplots(figsize=(7, 3.5))
    categories = ['결과 처리\n전 과정', '오류 재처리\n발생 건수', '재채점\n요청']
    old_vals = [3, 1, 1]   # 3일, 발생, 발생
    new_vals = [0, 0, 0]
    old_labels = ['약 3일', '발생(2,000명)', '다수 발생']
    new_labels = ['즉시', '0건', '0건']

    x = np.arange(len(categories))
    w = 0.35
    bars1 = ax.bar(x - w/2, [3, 2, 2], w, label='기존(구글 폼)',
                   color='#c0392b', alpha=0.85, zorder=3)
    bars2 = ax.bar(x + w/2, [0.1, 0.1, 0.1], w, label='CBT 시스템',
                   color='#1F4E79', alpha=0.85, zorder=3)

    ax.set_xticks(x)
    ax.set_xticklabels(categories, fontsize=10)
    ax.set_yticks([])
    ax.set_title('기존 방식 vs CBT 시스템 — 결과 처리 비교', fontsize=12, fontweight='bold', pad=12)
    ax.legend(fontsize=9)
    ax.grid(axis='y', linestyle='--', alpha=0.4, zorder=0)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['left'].set_visible(False)

    for bar, lbl in zip(bars1, old_labels):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.05,
                lbl, ha='center', va='bottom', fontsize=8.5, color='#c0392b', fontweight='bold')
    for bar, lbl in zip(bars2, new_labels):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.05,
                lbl, ha='center', va='bottom', fontsize=8.5, color='#1F4E79', fontweight='bold')
    return fig_to_base64(fig)

# ── 차트 2: 직렬별 응시 현황 ────────────────────────────────────
def chart_error_rate():
    fig, axes = plt.subplots(1, 2, figsize=(9, 3.8))

    # 도넛: 정상/오류
    ax = axes[0]
    total = 5323
    normal = total - 30
    sizes = [normal, 30]
    colors = ['#1F4E79', '#c0392b']
    wedges, _ = ax.pie(sizes, colors=colors, startangle=90,
                       wedgeprops=dict(width=0.5))
    ax.set_title('시범 운영 응시 현황\n(총 5,323명)', fontsize=11, fontweight='bold')
    ax.text(0, 0.08, '5,323명', ha='center', va='center', fontsize=11, fontweight='bold', color='#1F4E79')
    ax.text(0, -0.18, '(약 5,300명)', ha='center', va='center', fontsize=8.5, color='#666')
    legend_els = [mpatches.Patch(color='#1F4E79', label=f'정상 응시 {normal:,}명 (99.43%)'),
                  mpatches.Patch(color='#c0392b', label='입력 오류 30명 (0.57%)')]
    ax.legend(handles=legend_els, loc='lower center', bbox_to_anchor=(0.5, -0.2),
              fontsize=8.5)

    # 가로막대: 직렬별 실제 응시 인원
    ax2 = axes[1]
    serials = ['기동대원', '구급(교육)', '구조대원', '지휘대', '구급(자격)', '진압대원']
    counts = [462, 245, 710, 506, 1320, 2080]
    colors2 = ['#AED6F1', '#85B8D9', '#5499C7', '#2874A6', '#1A5276', '#1F4E79']
    bars = ax2.barh(serials, counts, color=colors2, alpha=0.92, height=0.6)
    ax2.set_title('직렬별 응시 인원\n(실제)', fontsize=11, fontweight='bold')
    ax2.set_xlabel('명', fontsize=9)
    ax2.spines['top'].set_visible(False)
    ax2.spines['right'].set_visible(False)
    ax2.spines['left'].set_visible(False)
    ax2.tick_params(left=False)
    for bar, cnt in zip(bars, counts):
        ax2.text(bar.get_width() + 20, bar.get_y() + bar.get_height()/2,
                 f'{cnt:,}명', va='center', fontsize=9, fontweight='bold', color='#1F4E79')
    ax2.set_xlim(0, 2500)
    ax2.grid(axis='x', linestyle='--', alpha=0.3)

    fig.tight_layout(pad=1.5)
    return fig_to_base64(fig)

# ── 차트 3: 전국 평가 방식 현황 ─────────────────────────────────
def chart_nationwide():
    fig, ax = plt.subplots(figsize=(7, 3.5))
    methods = ['구글 폼\n(서울 등)', '종이시험', '자체 플랫폼', '기타\n(미파악)']
    counts = [5, 8, 2, 4]
    colors = ['#E74C3C', '#E67E22', '#27AE60', '#95A5A6']
    bars = ax.bar(methods, counts, color=colors, alpha=0.88, width=0.55, zorder=3)
    ax.set_title('전국 19개 소방본부 이론평가 방식 현황\n(추정)', fontsize=12, fontweight='bold', pad=12)
    ax.set_ylabel('소방본부 수', fontsize=10)
    ax.set_ylim(0, 12)
    ax.grid(axis='y', linestyle='--', alpha=0.4, zorder=0)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    for bar, cnt in zip(bars, counts):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.2,
                f'{cnt}개', ha='center', fontsize=10, fontweight='bold')
    ax.text(0.5, -0.22, '※ 정확한 현황은 소방청 조사 필요 (추정치)',
            ha='center', transform=ax.transAxes, fontsize=8, color='#888')
    return fig_to_base64(fig)

# ── 차트 4: 추진 일정 간트 ──────────────────────────────────────
def chart_gantt():
    fig, ax = plt.subplots(figsize=(10, 4.5))
    tasks = [
        ('서울본부\n공식 승인',      2026.25, 2026.42),
        ('소방청\n보고·협의',        2026.42, 2026.58),
        ('도입 가이드\n문서화',      2026.5,  2026.75),
        ('수도권\n시범 적용',        2026.75, 2026.92),
        ('시범 운영\n결과 보고',     2026.92, 2027.0),
        ('전국 19개\n본부 확산',     2027.0,  2027.5),
        ('소방청 지침\n개정 반영',   2027.5,  2027.92),
    ]
    colors = ['#1F4E79','#2874A6','#5499C7','#1F4E79','#2874A6','#E74C3C','#C0392B']
    for i, ((label, start, end), c) in enumerate(zip(tasks, colors)):
        width = end - start
        ax.barh(i, width, left=start, height=0.62, color=c, alpha=0.88, zorder=3)
        # 막대 중앙에 텍스트, 짧은 막대는 오른쪽 바깥에 표시
        mid = start + width / 2
        if width >= 0.18:
            ax.text(mid, i, label, ha='center', va='center',
                    fontsize=7.5, color='white', fontweight='bold', linespacing=1.3)
        else:
            ax.text(end + 0.02, i, label, ha='left', va='center',
                    fontsize=7.5, color=c, fontweight='bold', linespacing=1.3)

    ax.set_xlim(2026.1, 2028.3)
    ax.set_yticks([])
    ax.set_xlabel('연도', fontsize=10)
    ax.set_title('추진 일정 (2026~2027)', fontsize=12, fontweight='bold', pad=12)
    ticks = [2026.25, 2026.5, 2026.75, 2027.0, 2027.5, 2028.0]
    labels = ["'26.4월", "'26.7월", "'26.10월", "'27.1월", "'27.7월", "'28.1월"]
    ax.set_xticks(ticks)
    ax.set_xticklabels(labels, fontsize=9)
    ax.grid(axis='x', linestyle='--', alpha=0.3, zorder=0)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['left'].set_visible(False)
    fig.tight_layout()
    return fig_to_base64(fig)

# ── HTML 생성 ───────────────────────────────────────────────────
print("차트 생성 중...")
c2 = chart_error_rate()
c4 = chart_gantt()
print("차트 생성 완료")

html = f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap');
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{
  font-family: 'Malgun Gothic', '맑은 고딕', 'Noto Sans KR', sans-serif;
  font-size: 10.5pt;
  line-height: 1.75;
  color: #1a1a1a;
  padding: 0;
}}
.cover {{
  width: 100%; height: 100vh;
  display: flex; flex-direction: column;
  justify-content: center; align-items: center;
  background: linear-gradient(160deg, #1F4E79 0%, #2874A6 60%, #5499C7 100%);
  color: white;
  page-break-after: always;
  text-align: center;
  padding: 60px;
}}
.cover .badge {{
  background: rgba(255,255,255,0.18);
  border: 1px solid rgba(255,255,255,0.4);
  border-radius: 20px;
  padding: 6px 20px;
  font-size: 10pt;
  margin-bottom: 30px;
  letter-spacing: 2px;
}}
.cover h1 {{
  font-size: 26pt;
  font-weight: 700;
  line-height: 1.4;
  margin-bottom: 16px;
  color: white;
  border: none;
  text-shadow: 0 2px 8px rgba(0,0,0,0.2);
}}
.cover .subtitle {{
  font-size: 13pt;
  opacity: 0.88;
  margin-bottom: 50px;
}}
.cover .meta {{
  font-size: 10pt;
  opacity: 0.8;
  line-height: 2;
}}
.cover .divider {{
  width: 60px; height: 3px;
  background: rgba(255,255,255,0.5);
  margin: 28px auto;
  border-radius: 2px;
}}
.kpi-row {{
  display: flex; gap: 12px;
  margin: 20px 0;
}}
.kpi {{
  flex: 1;
  background: #1F4E79;
  border-radius: 8px;
  padding: 16px 10px 14px;
  text-align: center;
}}
.kpi .num {{
  font-size: 18pt;
  font-weight: 700;
  color: #ffffff;
  line-height: 1.3;
  white-space: nowrap;
  letter-spacing: -0.5px;
}}
.kpi .num .arrow {{
  color: #AED6F1;
  font-size: 14pt;
  font-weight: 400;
}}
.kpi .num .highlight {{
  color: #F9E79F;
}}
.kpi .unit {{
  font-size: 8.5pt;
  color: rgba(255,255,255,0.72);
  margin-top: 6px;
  line-height: 1.4;
}}
.page {{ padding: 28px 36px; }}
h2 {{
  font-size: 14pt;
  font-weight: 700;
  color: #1F4E79;
  border-left: 5px solid #1F4E79;
  padding-left: 10px;
  margin: 28px 0 12px;
}}
h3 {{
  font-size: 11pt;
  font-weight: 700;
  color: #2874A6;
  margin: 18px 0 8px;
  padding-left: 4px;
}}
p {{ margin-bottom: 8px; }}
table {{
  border-collapse: collapse;
  width: 100%;
  margin: 10px 0 16px;
  font-size: 9.5pt;
}}
th {{
  background: #1F4E79;
  color: white;
  padding: 8px 10px;
  text-align: left;
  font-weight: 700;
}}
td {{
  padding: 7px 10px;
  border: 1px solid #ddd;
  vertical-align: top;
}}
tr:nth-child(even) td {{ background: #F4F8FC; }}
blockquote {{
  border-left: 3px solid #aac;
  margin: 6px 0 10px;
  padding: 4px 12px;
  color: #555;
  font-size: 9.5pt;
}}
ul {{ padding-left: 18px; margin-bottom: 8px; }}
li {{ margin-bottom: 3px; }}
strong {{ color: #1F4E79; }}
.red {{ color: #c0392b; font-weight: 700; }}
.chart-wrap {{
  text-align: center;
  margin: 14px 0 18px;
}}
.chart-wrap img {{ max-width: 100%; border-radius: 6px; }}
.chart-caption {{
  font-size: 9pt;
  color: #777;
  margin-top: 4px;
}}
.page-break {{ page-break-after: always; }}
.info-box {{
  background: #EBF3FB;
  border: 1px solid #AED6F1;
  border-radius: 6px;
  padding: 12px 16px;
  margin: 10px 0 14px;
  font-size: 10pt;
}}
.warn-box {{
  background: #FEF9E7;
  border: 1px solid #F9CA24;
  border-radius: 6px;
  padding: 10px 14px;
  margin: 8px 0;
  font-size: 9.5pt;
}}
.footer {{
  border-top: 2px solid #1F4E79;
  margin-top: 40px;
  padding-top: 14px;
  font-size: 9.5pt;
  color: #444;
}}
.tag {{
  display: inline-block;
  background: #1F4E79;
  color: white;
  border-radius: 3px;
  padding: 1px 7px;
  font-size: 9pt;
  margin-right: 4px;
}}
</style>
</head>
<body>

<!-- 표지 -->
<div class="cover">
  <div class="badge">서울소방재난본부 공식 제안서</div>
  <h1>소방 직장훈련<br>CBT 평가시스템</h1>
  <div class="subtitle">전국 활용 제안서</div>
  <div class="divider"></div>
  <div class="meta">
    담당: 재난대응과 소방위 김영훈<br>
    작성일: 2026년 4월 18일<br>
    시범 운영: 2026. 3. (서울 전 소방서 5,300명)
  </div>
</div>

<div class="page">

<!-- KPI 요약 -->
<div class="kpi-row">
  <div class="kpi">
    <div class="num">5,300명</div>
    <div class="unit">서울 시범 운영<br>응시 인원</div>
  </div>
  <div class="kpi">
    <div class="num">3일 <span class="arrow">→</span> <span class="highlight">즉시</span></div>
    <div class="unit">결과 처리<br>소요 시간</div>
  </div>
  <div class="kpi">
    <div class="num"><span class="highlight">0건</span></div>
    <div class="unit">수동 재채점<br>요청</div>
  </div>
  <div class="kpi">
    <div class="num"><span class="highlight">0원</span></div>
    <div class="unit">추가 도입<br>예산</div>
  </div>
</div>

<!-- 1. 사업 개요 -->
<h2>1. 사업 개요</h2>
<table>
  <tr><th>항목</th><th>내용</th></tr>
  <tr><td>사업명</td><td>소방 직장훈련 CBT 평가시스템 전국 활용</td></tr>
  <tr><td>대상</td><td>전국 19개 소방본부 및 소속 소방공무원</td></tr>
  <tr><td>플랫폼</td><td>웹 기반 (PC·모바일 호환), Firebase 클라우드 (서울 리전)</td></tr>
  <tr><td>시범 운영</td><td>서울소방재난본부 (2026. 3.) — 26개 소방서, 약 5,300명</td></tr>
  <tr><td>목표</td><td>직장훈련 평가의 전국 표준화, 행정 효율화, 소방공무원 현장 역량 향상 지원</td></tr>
</table>

<!-- 2. 추진 배경 -->
<h2>2. 추진 배경</h2>
<p>소방공무원 직장훈련 성적평정은 <strong>전술훈련평가</strong>와 <strong>이론평가(직장교육평가)</strong> 두 축으로 구성된다. 두 항목은 각 2점 만점(총 4점)으로 구성되며, 소방청 지침에 따라 <strong>연 2회(상반기·하반기)</strong> 실시해야 한다.</p>
<p>전술훈련평가는 각 소방관서가 자체 평가위원회를 구성하여 현장 평가하므로 본 시스템의 대상이 아니다. 반면 <strong>이론평가</strong>는 전국 19개 소방본부가 각자 다른 방식으로 운영하고 있어 문제가 지속되고 있다.</p>

<p>서울소방재난본부는 2026년 3월 자체 개발한 웹 기반 CBT 시스템으로 <strong>26개 소방서 5,300명 동시 이론평가</strong>를 실시하였으며, 기존 방식 대비 <strong>결과 처리 수일 → 즉시, 재채점 요청 0건</strong>의 성과를 거두었다. 이에 본 시스템의 전국 확산을 제안한다.</p>

<div class="page-break"></div>

<!-- 3. 기존 방식 문제점 -->
<h2>3. 서울소방재난본부 기존 방식(구글 폼)의 문제점</h2>
<p>서울소방재난본부는 기출문제를 사전 공개하고 QR코드로 접속 후 20문제를 무작위 출제하는 방식으로 운영하였다.</p>

<h3>3-1. 직종별 QR코드 다중 관리 문제</h3>
<p>직종(진압대·구급대·구조대·지휘대·기동대)마다 별도 폼·QR코드가 필요하여, 일선 센터 한 근무조에서만 <strong>최소 3개의 QR코드</strong>를 준비·배포해야 했다.</p>
<table>
  <tr><th>문제</th><th>내용</th></tr>
  <tr><td>QR코드 다중 관리</td><td>직종 수만큼 폼·QR 제작 및 버전 관리 필요</td></tr>
  <tr><td>배포 혼선</td><td>직종별 QR코드 구분·배포 중 오배포 가능성</td></tr>
  <tr><td>수정 시 재작업</td><td>문항 변경 시 해당 직종 폼 전체 재제작</td></tr>
  <tr><td>데이터 분산</td><td>직종별 결과가 분리 저장되어 통합 집계 별도 작업 필요</td></tr>
</table>

<h3>3-2. 채점 오류 빈발 및 구조적 한계</h3>
<ul>
  <li>단순 객관식 채점만 지원 — 복수 정답·부분 점수·조건부 채점 불가</li>
  <li>문제 오류 발견 시 이미 제출된 전체 응시 데이터 수동 재처리 필요</li>
  <li class="red">실제 사례: 구급대원 약 2,000명 분 수동 재처리 발생</li>
  <li>문제은행(Question Bank) 기능 미제공 — 세계 교육 현장에서도 지적되는 구글 폼의 대표적 한계</li>
</ul>

<h3>3-3. 데이터 분산으로 인한 통계 관리 어려움</h3>
<ul>
  <li>6개 직렬 폼 = 6개 별도 스프레드시트 — 소방서·부서별 통계 수동 교차 취합 필요</li>
  <li>응시 이력, 점수 추이, 소방서별 현황 등 원하는 기준 통계 즉시 조회 불가</li>
  <li>장기 이력 관리 및 반기별 비교 분석 불가</li>
  <li>결과 취합·오류 재처리·통계 정리 전 과정 <strong>약 3일 소요</strong></li>
</ul>

<h3>3-4. 공정성 및 본인 확인 문제</h3>
<p>구글 폼을 시험 도구로 사용하는 모든 기관에서 공통적으로 제기되는 구조적 한계이다.</p>
<table>
  <tr><th>취약점</th><th>내용</th></tr>
  <tr><td>시간 제한 미작동</td><td>기본 구글 폼에 시간 제한 기능 없음 — 검색·참고 후 답변 가능</td></tr>
  <tr><td>탭 전환 감지 불가</td><td>시험 중 다른 탭·앱 전환 감지 불가</td></tr>
  <tr><td>응시 횟수 제한 없음</td><td>링크를 아는 사람이라면 무제한 반복 응시 가능</td></tr>
  <tr><td>본인 확인 불가</td><td>이름 직접 입력 방식 — 대리 응시 방지 불가</td></tr>
  <tr><td>실시간 감독 불가</td><td>응시 현황 실시간 집계 불가</td></tr>
</table>

<h3>3-5. 전국 평가 방식 불통일</h3>
<ul>
  <li>전국 19개 소방본부가 각기 다른 평가 도구·방식 사용</li>
  <li>평가 결과의 비교·분석 불가</li>
  <li>소방청 차원의 전국 훈련 현황 파악 불가</li>
</ul>

<div class="page-break"></div>

<!-- 4. 시스템 개요 -->
<h2>4. 시스템 개요 및 주요 기능</h2>
<p>별도 앱 설치 없이 <strong>웹 브라우저</strong>로 접속 (PC·스마트폰 모두 가능), 로그인 후 본인 직렬 선택 → 즉시 시험 시작</p>

<table>
  <tr><th>구분</th><th>기능</th></tr>
  <tr><td>응시자</td><td>직렬별 맞춤 문제 출제, 20분 제한, 자동 채점, 즉시 결과 확인</td></tr>
  <tr><td>재응시</td><td>하루 최대 2회 (출동·비상근무 등 불가피한 상황 대비 1회 추가)</td></tr>
  <tr><td>문제 관리</td><td>직렬별 문제은행, 무작위 출제, 문제 추가·수정·삭제</td></tr>
  <tr><td>관리자</td><td>응시 현황 실시간 조회, 소방서·부서·직렬별 통계, 엑셀 내보내기</td></tr>
  <tr><td>공지사항</td><td>관리자 공지 등록·수정·삭제 (응시자 메인화면 노출)</td></tr>
  <tr><td>보안</td><td>계정 기반 접근 제어, Firestore 보안 규칙 적용</td></tr>
</table>

<h3>직렬별 출제 구성</h3>
<table>
  <tr><th>직렬</th><th>출제 과목 및 문항 수</th></tr>
  <tr><td>지휘대</td><td>안전관리 10 + 소방시설 10</td></tr>
  <tr><td>진압대원</td><td>화재 10 + 소방시설 5 + 안전관리 5</td></tr>
  <tr><td>구조대원</td><td>구조 10 + 소방시설 5 + 안전관리 5</td></tr>
  <tr><td>구급대원(자격자)</td><td>구급 15 + 안전관리 5</td></tr>
  <tr><td>구급대원(교육이수자)</td><td>구급 15 + 안전관리 5</td></tr>
  <tr><td>기동대원</td><td>장비 10 + 안전관리 10</td></tr>
</table>

<div class="page-break"></div>

<!-- 5. 시범 운영 성과 -->
<h2>5. 서울소방 시범 운영 성과</h2>
<ul>
  <li><strong>운영 기간</strong>: 2026. 3. 3. ~ 3. 27. (25일간, 26개 소방서 자율 일정)</li>
  <li><strong>총 응시 인원</strong>: 약 5,300명</li>
</ul>

<div class="chart-wrap">
  <img src="data:image/png;base64,{c2}">
  <div class="chart-caption">▲ 시범 운영 응시 현황 및 직렬별 비율</div>
</div>

<table>
  <tr><th>지표</th><th>기존(구글 폼)</th><th>CBT 시스템</th><th>개선 효과</th></tr>
  <tr><td>결과 처리 전 과정</td><td>약 3일 소요</td><td>즉시 자동 완료</td><td class="red">수일 → 즉시</td></tr>
  <tr><td>오류 재처리</td><td>2,000명 수동 재처리</td><td>0건</td><td class="red">완전 제거</td></tr>
  <tr><td>재채점 요청</td><td>다수 발생</td><td>0건</td><td class="red">완전 제거</td></tr>
  <tr><td>통계 집계</td><td>6개 시트 수동 취합</td><td>실시간 자동</td><td class="red">즉시</td></tr>
  <tr><td>업무 효율</td><td colspan="2">담당자 추산 약 3배 향상</td><td class="red">3배↑</td></tr>
</table>

<h3>한계점 및 개선 완료 사항</h3>
<table>
  <tr><th>한계점</th><th>원인</th><th>개선 현황</th></tr>
  <tr><td>회원가입 오류 (30명, 0.57%)</td><td>이메일·소속 오입력</td><td><strong>@seoul.go.kr 인증 필수화로 완전 차단</strong></td></tr>
  <tr><td>Firebase 읽기 한도 초과 (4회)</td><td>엑셀 일괄 내보내기 시 발생 — 응시 자체는 무관</td><td>시험 후 1회 내보내기로 무료 운영 가능</td></tr>
  <tr><td>문제 오류 수정에 개발 지식 필요</td><td>관리자 화면 문항 수정 기능 미구현</td><td>향후 개선이 필요한 사항으로 인식 중</td></tr>
</table>

<div class="page-break"></div>

<!-- 6. 소방청 연계 -->
<h2>6. 소방청 연계 및 공식화 방안</h2>

<div class="warn-box">
  ⚠ 소방청은 서울시·서울소방재난본부의 공식 승인을 전국 확산의 <strong>선결 조건</strong>으로 요구하고 있다. 내부 공식 결재 완료 후 소방청 보고 순서로 진행 필요.
</div>

<h3>개인정보 및 보안 검토</h3>
<p>Google Firebase(서울 리전, asia-northeast3) 기반 — 데이터 국내 서버 저장</p>
<blockquote>수집 정보: 이름, 소속(소방서·부서), 직렬, 시험 점수, 이메일 주소 — 주민등록번호 등 민감정보 미수집</blockquote>
<table>
  <tr><th>단계</th><th>내용</th></tr>
  <tr><td>단기</td><td>개인정보 처리방침 수립 및 고지, 최소 수집 원칙 적용</td></tr>
  <tr><td>중기</td><td>소방청 보안심의 요청 및 취약점 점검 실시</td></tr>
  <tr><td>장기</td><td>필요 시 행정안전부 G-Cloud(공공 클라우드)로 전환</td></tr>
</table>

<h3>소방청 협조 요청 사항</h3>
<table>
  <tr><th></th><th>요청 사항</th><th>세부 내용</th></tr>
  <tr><td>①</td><td>서울시·서울소방재난본부 공식 승인</td><td>정식 도입 결재, 공문 발행, 인트라넷 링크 등록</td></tr>
  <tr><td>②</td><td>소방청 직장훈련 플랫폼 목록 등재</td><td>직장훈련 지침 내 공식 평가 도구 명시</td></tr>
  <tr><td>③</td><td>보안 심의 및 개인정보 검토 협조</td><td>정보보안 담당 부서 보안 심의, 개인정보 처리방침 검토</td></tr>
</table>

<!-- 7. 전국 확산 계획 -->
<h2>7. 전국 확산 계획</h2>

<table>
  <tr><th>구분</th><th>[1안] 서울 시스템 공동 활용</th><th>[2안] 전국 단일 플랫폼 구축 ★권장</th></tr>
  <tr><td>개요</td><td>서울 시스템에 각 소방본부 계정 추가</td><td>소방청 주관 전국 통합 시스템 구축</td></tr>
  <tr><td>장점</td><td>별도 구축 비용 없음, 빠른 도입</td><td>소방본부별 독립 운영, 소방청 통합 조회 가능</td></tr>
  <tr><td>단점</td><td>문제은행 혼재 우려</td><td>구축 협의 기간 소요</td></tr>
</table>

<div class="chart-wrap">
  <img src="data:image/png;base64,{c4}">
  <div class="chart-caption">▲ 추진 일정 (2026~2027)</div>
</div>

<table>
  <tr><th>단계</th><th>시기</th><th>내용</th></tr>
  <tr><td>1단계</td><td>2026 하반기</td><td>서울 + 수도권 소방본부 시범 적용 (경기남부, 경기북부, 인천)</td></tr>
  <tr><td>2단계</td><td>2027 상반기</td><td>전국 19개 소방본부 확산 / 소방청 공식 플랫폼 등재</td></tr>
  <tr><td>3단계</td><td>2027 하반기</td><td>문제은행 전국 표준화 / 소방청 직장훈련 지침 개정 반영</td></tr>
</table>

<div class="page-break"></div>

<!-- 8. 소요 예산 -->
<h2>8. 소요 예산</h2>

<div class="info-box">
  💡 <strong>본 시스템은 이미 완성된 형태</strong>로, 각 소방본부가 Firebase 프로젝트만 생성하면 <strong>별도 개발 비용 없이 즉시 도입 가능</strong>하다. 문제은행도 서울 운영 중인 약 400문제를 기반으로 자체 추가·수정하면 되므로 추가 비용이 발생하지 않는다.
</div>

<h3>현재 운영 비용 (서울, 연간)</h3>
<table>
  <tr><th>항목</th><th>비용</th><th>비고</th></tr>
  <tr><td>Firebase Hosting</td><td>무료</td><td>현재 무료 플랜</td></tr>
  <tr><td>Firestore DB</td><td>무료</td><td>엑셀 내보내기 시 읽기 한도 4회 초과했으나 차단 없이 정상 작동 — 시험 후 1회 내보내기로 무료 운영 가능</td></tr>
  <tr><td>도메인</td><td>무료 (web.app)</td><td>공식 도메인 필요 시 별도</td></tr>
  <tr><td><strong>소계</strong></td><td><strong>실질적 0원</strong></td><td></td></tr>
</table>

<h3>전국 확산 시 예산 (소방본부별 독립 운영 기준)</h3>
<table>
  <tr><th>항목</th><th>금액</th><th>비고</th></tr>
  <tr><td>서버 인프라</td><td>무료~소액</td><td>소방본부별 Firebase 독립 운영 (Spark 무료 플랜)</td></tr>
  <tr><td>운영·유지보수</td><td>자체 담당</td><td>소방본부 내 담당자 직접 운영 가능</td></tr>
  <tr><td><strong>합계</strong></td><td><strong>실질적 0원</strong></td><td>추가 예산 없이 전국 확산 가능</td></tr>
</table>
<blockquote>※ 응시 인원이 많아 무료 한도 초과 시 Blaze(종량제) 전환 — 월 수만원 수준으로 해결 가능</blockquote>

<!-- 9. 기대 효과 -->
<h2>9. 기대 효과</h2>
<table>
  <tr><th>구분</th><th>기존(구글 폼)</th><th>CBT 시스템</th></tr>
  <tr><td>QR코드 관리</td><td>직종별 다수 제작·배포</td><td>로그인 1회로 대체</td></tr>
  <tr><td>결과 처리</td><td>취합·재처리·통계 정리 약 3일</td><td>시험 종료 즉시 자동 완료</td></tr>
  <tr><td>오류 재처리</td><td>수천 명 수동 (약 3시간)</td><td>즉시 일괄 수정</td></tr>
  <tr><td>통계 집계</td><td>6개 시트 수동 교차 취합</td><td>실시간 자동</td></tr>
  <tr><td>본인 확인</td><td>불가</td><td>계정 기반 인증</td></tr>
  <tr><td>전국 현황 파악</td><td>불가</td><td>소방청 통합 조회 가능</td></tr>
</table>

<!-- 10. 추진 일정 -->
<h2>10. 추진 일정</h2>
<table>
  <tr><th>시기</th><th>내용</th></tr>
  <tr><td>2026. 4~5월</td><td>서울소방재난본부 공식 승인 및 내부 결재</td></tr>
  <tr><td>2026. 5~6월</td><td>소방청 보고 및 전국 활용 협의</td></tr>
  <tr><td>2026. 6~8월</td><td>소방본부별 도입 가이드 문서화</td></tr>
  <tr><td>2026. 9~10월</td><td>수도권 소방본부 시범 적용 (경기남부, 경기북부, 인천)</td></tr>
  <tr><td>2026. 11월</td><td>시범 운영 결과 보고</td></tr>
  <tr><td>2027. 상반기</td><td>전국 19개 소방본부 확산</td></tr>
  <tr><td>2027. 하반기</td><td>소방청 직장훈련 지침 개정 반영</td></tr>
</table>

<!-- 붙임 -->
<h2>붙임</h2>
<ol>
  <li>서울소방 CBT 시스템 화면 캡처</li>
  <li>시범 운영 결과 통계 (2026. 3. 3. ~ 3. 27.)</li>
  <li>기능 시연 링크: https://seoul-dc4d7.web.app</li>
</ol>

<div class="footer">
  <strong>본 시스템 개발·운영</strong> &nbsp;|&nbsp;
  서울소방재난본부 마포소방서 소방장 김문기 &nbsp;
  📧 rlaansrl1@seoul.go.kr &nbsp;
  📞 010-9915-2232
</div>

</div>
</body>
</html>
"""

# HTML 저장
html_path = r'D:\dev\CBT-fire2\기타\소방직장훈련_CBT_전국활용_제안서.html'
with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)
print(f"HTML 저장 완료: {html_path}")

# PDF 변환
try:
    from weasyprint import HTML
    pdf_path = r'D:\dev\CBT-fire2\기타\소방직장훈련_CBT_전국활용_제안서.pdf'
    HTML(filename=html_path).write_pdf(pdf_path)
    print(f"PDF 저장 완료: {pdf_path}")
except Exception as e:
    print(f"PDF 변환 오류: {e}")
    print("HTML 파일을 브라우저에서 열어 직접 PDF로 인쇄하세요.")
