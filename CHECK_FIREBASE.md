# Firebase 설정 확인 가이드

## 오류: auth/invalid-login-credentials

이 오류가 발생하는 경우:

### 1. Firebase Authentication 활성화 확인

1. Firebase 콘솔 접속: https://console.firebase.google.com/project/firefighter-quiz/overview
2. 왼쪽 메뉴에서 **Authentication** 클릭
3. **Sign-in method** 탭 클릭
4. **이메일/비밀번호** 항목 확인:
   - 상태가 **사용 설정됨**이어야 함
   - 만약 **사용 중지됨**이면 클릭해서 활성화

### 2. Firestore Database 생성 확인

1. 왼쪽 메뉴에서 **Firestore Database** 클릭
2. 데이터베이스가 없으면 **데이터베이스 만들기** 클릭
3. 위치 선택: **asia-northeast3 (서울)** 권장
4. 보안 규칙: **테스트 모드로 시작** 선택 (나중에 변경 가능)

### 3. 회원가입부터 시작

로그인 전에 반드시 **회원가입**을 먼저 해야 합니다:

1. https://firefighter-quiz.web.app/login.html 접속
2. 화면 하단의 **"회원가입"** 링크 클릭
3. 이름, 이메일, 비밀번호(6자 이상) 입력
4. **"회원가입"** 버튼 클릭
5. 성공하면 자동으로 로그인 모드로 전환됨
6. 다시 이메일/비밀번호 입력 후 **"로그인"**

### 4. 보안 규칙 설정 (선택사항)

Firestore Database > 규칙 탭에서 아래 규칙 적용:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null;
    }

    match /exam_results/{resultId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }
  }
}
```

### 5. 확인 방법

회원가입 후 Firebase 콘솔에서 확인:
1. Authentication > Users 탭
2. 방금 가입한 사용자가 목록에 표시되어야 함
