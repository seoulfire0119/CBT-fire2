# CBT 프로그램 설정 가이드

## 개요
이 CBT(Computer Based Test) 프로그램에 회원가입, 로그인, 점수 데이터 저장 및 엑셀 내보내기 기능이 추가되었습니다.

## 주요 기능
- ✅ 회원가입/로그인 시스템
- ✅ 사용자별 시험 결과 저장
- ✅ 관리자 페이지에서 모든 결과 조회
- ✅ 엑셀 파일로 결과 내보내기

## Firebase 설정 (필수)

### 1. Firebase 콘솔 설정

1. [Firebase Console](https://console.firebase.google.com/)에 접속
2. 프로젝트 선택: `firefighter-quiz`
3. 왼쪽 메뉴에서 **Authentication** 클릭
   - **Sign-in method** 탭 클릭
   - **이메일/비밀번호** 활성화
4. 왼쪽 메뉴에서 **Firestore Database** 클릭
   - **데이터베이스 만들기** 클릭
   - 테스트 모드로 시작 (나중에 규칙 변경 가능)

### 2. Firebase SDK 설정

`public/firebase-config.js` 파일을 열어 실제 Firebase 설정값을 입력하세요:

1. Firebase 콘솔에서 프로젝트 설정 > 일반 > 내 앱 > SDK 설정 및 구성
2. Config 객체를 복사하여 아래와 같이 입력:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "firefighter-quiz.firebaseapp.com",
  projectId: "firefighter-quiz",
  storageBucket: "firefighter-quiz.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 3. Firestore 보안 규칙 설정 (권장)

Firebase 콘솔의 Firestore Database > 규칙 탭에서 아래 규칙을 적용하세요:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 사용자 정보는 본인만 읽기 가능, 생성은 인증된 사용자만
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update, delete: if request.auth != null && request.auth.uid == userId;
    }

    // 시험 결과는 본인 것만 생성 가능, 모든 인증 사용자가 읽기 가능 (관리자 페이지용)
    match /exam_results/{resultId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }
  }
}
```

## 사용 방법

### 1. 회원가입/로그인

1. `public/login.html` 페이지 접속
2. 회원가입:
   - 이름, 이메일, 비밀번호(6자 이상) 입력
   - "회원가입" 버튼 클릭
3. 로그인:
   - 이메일, 비밀번호 입력
   - "로그인" 버튼 클릭

### 2. 시험 응시

1. 로그인 후 자동으로 시험 페이지로 이동
2. 직무 선택 (지휘대/진압대원/구조대원/구급대원)
3. "시험 시작" 버튼 클릭
4. 문제 풀이 후 "제출하기"
5. 결과는 자동으로 Firestore에 저장됨

### 3. 관리자 페이지 (결과 조회 및 엑셀 내보내기)

1. `public/admin.html` 페이지 접속 또는 시험 페이지 상단의 "관리자 페이지" 링크 클릭
2. 통계 확인:
   - 총 응시자 수
   - 총 시험 횟수
   - 평균 점수
   - 최고 점수
3. 필터링:
   - 직무별 필터
   - 사용자별 필터
4. 엑셀 내보내기:
   - "엑셀로 내보내기" 버튼 클릭
   - `CBT시험결과_YYYY-MM-DD.xlsx` 파일 다운로드

## 데이터 구조

### users 컬렉션
```javascript
{
  name: "사용자 이름",
  email: "user@example.com",
  createdAt: Timestamp
}
```

### exam_results 컬렉션
```javascript
{
  userId: "사용자 UID",
  userEmail: "user@example.com",
  jobType: "commander", // commander, firefighter, rescuer, paramedic
  jobName: "지휘대",
  score: 85, // 점수 (0-100)
  correct: 17, // 정답 수
  total: 20, // 전체 문항 수
  timestamp: Timestamp,
  timeTaken: 450 // 소요 시간 (초)
}
```

## 파일 구조

```
public/
├── login.html          # 로그인/회원가입 페이지
├── index.html          # 시험 페이지 (수정됨)
├── admin.html          # 관리자 페이지 (새로 추가)
├── auth.js             # 인증 로직 (새로 추가)
├── app.js              # 시험 로직 (수정됨 - Firebase 연동)
├── admin.js            # 관리자 페이지 로직 (새로 추가)
├── firebase-config.js  # Firebase 설정 (새로 추가)
├── styles.css          # 스타일시트
└── data/               # 문제 JSON 파일들
```

## 배포

### Firebase Hosting으로 배포

```bash
# Firebase CLI 설치 (처음만)
npm install -g firebase-tools

# 로그인
firebase login

# 배포
firebase deploy
```

배포 후 URL: `https://firefighter-quiz.web.app`

## 문제 해결

### "Firebase SDK를 찾을 수 없습니다" 오류
- `firebase-config.js` 파일에 실제 Firebase 설정값을 입력했는지 확인

### 로그인은 되는데 데이터가 저장되지 않음
- Firestore Database가 생성되었는지 확인
- 보안 규칙이 올바르게 설정되었는지 확인

### 엑셀 내보내기가 작동하지 않음
- 브라우저 콘솔에서 SheetJS 라이브러리가 로드되었는지 확인
- 필터링된 데이터가 있는지 확인

## 추가 개선 사항 (선택)

- [ ] 관리자 전용 계정 설정 (특정 이메일만 관리자 페이지 접근)
- [ ] 비밀번호 재설정 기능
- [ ] 사용자 프로필 수정 기능
- [ ] 시험 결과 상세 분석 (문항별 정답률 등)
- [ ] 차트/그래프 추가 (Chart.js 등)

## 라이선스
이 프로젝트는 교육 목적으로 제작되었습니다.
