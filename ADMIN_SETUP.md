# 관리자 권한 설정 방법

## Firebase Console에서 관리자 설정

1. Firebase Console 접속: https://console.firebase.google.com/
2. 프로젝트 선택
3. Firestore Database 메뉴 선택
4. `users` 컬렉션에서 관리자로 만들 사용자 문서 클릭
5. `isAdmin` 필드 추가:
   - 필드 이름: `isAdmin`
   - 타입: `boolean`
   - 값: `true`
6. 저장

## 공지사항 테스트

관리자로 로그인 후:

1. 관리자 페이지 접속
2. "공지사항 관리" 섹션에서 새 공지 작성
3. 제목 예: "2026년 상반기 CBT 시험 안내"
4. 내용 예: "2026년 1월 20일부터 2월 28일까지 상반기 시험이 진행됩니다."
5. "공지 등록" 버튼 클릭
6. 메인 페이지에서 공지사항이 표시되는지 확인

## Firestore 보안 규칙 설정

Firebase Console > Firestore Database > Rules 탭에서:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 사용자 문서
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }

    // 시험 결과
    match /exam_results/{resultId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null &&
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
      allow delete: if request.auth != null &&
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }

    // 공지사항
    match /notifications/{notifId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
  }
}
```

## Firestore 인덱스 설정

Firebase Console > Firestore Database > Indexes 탭에서 복합 인덱스 추가:

### notifications 컬렉션
- 필드: `active` (Ascending) + `createdAt` (Descending)
- 쿼리 범위: Collection

또는 앱 실행 중 에러 메시지에 나오는 인덱스 생성 링크를 클릭하여 자동 생성
