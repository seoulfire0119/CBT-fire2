# 새 Firebase 프로젝트로 마이그레이션 가이드

## 현재 상태
- 기존 프로젝트: `firefighter-quiz`
- 새 프로젝트: (생성 예정)

## 마이그레이션 단계

### 1. Firebase 콘솔에서 새 프로젝트 생성

1. https://console.firebase.google.com/ 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름 입력 (예: `cbt-fire-2024`)
4. 프로젝트 생성 완료

### 2. Firebase 서비스 활성화

#### Authentication
1. Authentication > 시작하기
2. Sign-in method > 이메일/비밀번호 활성화

#### Firestore Database
1. Firestore Database > 데이터베이스 만들기
2. 위치: asia-northeast3 (서울)
3. 보안 규칙: 테스트 모드로 시작

### 3. 웹 앱 등록 및 설정 가져오기

1. 프로젝트 개요 > 웹 앱 추가 (</>)
2. 앱 닉네임: CBT Fire
3. Firebase Hosting 설정 체크
4. Firebase SDK 설정 복사

### 4. 로컬 프로젝트 설정 업데이트

#### 4-1. .firebaserc 파일 수정

```bash
# 현재 디렉토리에서 실행
firebase use --add
```

프로젝트 선택 후 alias 이름 입력 (예: `production`)

또는 직접 `.firebaserc` 파일 수정:

```json
{
  "projects": {
    "default": "새-프로젝트-ID"
  }
}
```

#### 4-2. firebase-config.js 업데이트

`public/firebase-config.js` 파일을 열어서 새 프로젝트 설정으로 교체:

```javascript
const firebaseConfig = {
  apiKey: "새-API-KEY",
  authDomain: "새-프로젝트-ID.firebaseapp.com",
  projectId: "새-프로젝트-ID",
  storageBucket: "새-프로젝트-ID.firebasestorage.app",
  messagingSenderId: "새-SENDER-ID",
  appId: "새-APP-ID"
};
```

### 5. Firestore 보안 규칙 배포

```bash
firebase deploy --only firestore:rules
```

### 6. 웹사이트 배포

```bash
firebase deploy --only hosting
```

### 7. 배포 확인

- 새 URL: `https://새-프로젝트-ID.web.app`
- Firebase 콘솔에서 확인

## 명령어 요약

```bash
# 1. 새 프로젝트 연결
firebase use --add

# 2. 현재 프로젝트 확인
firebase projects:list

# 3. Firestore 규칙 배포
firebase deploy --only firestore:rules

# 4. 웹사이트 배포
firebase deploy --only hosting

# 5. 전체 배포
firebase deploy
```

## 프로젝트 전환

여러 프로젝트를 관리하는 경우:

```bash
# 기존 프로젝트로 전환
firebase use firefighter-quiz

# 새 프로젝트로 전환
firebase use 새-프로젝트-ID

# 또는 alias 사용
firebase use production
```

## 주의사항

1. **데이터 마이그레이션 없음**: 새 프로젝트는 빈 상태로 시작
2. **사용자 데이터**: 기존 사용자는 새로 회원가입 필요
3. **시험 결과**: 기존 데이터는 새 프로젝트로 자동 이전되지 않음

## 기존 데이터 이전 (선택사항)

기존 Firestore 데이터를 새 프로젝트로 이전하려면:

1. Firebase 콘솔에서 데이터 내보내기
2. 또는 스크립트로 데이터 복사 (수동 작업 필요)
