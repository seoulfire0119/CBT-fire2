# 직장훈련 CBT 평가 시스템

소방 직장훈련을 위한 CBT(Computer Based Test) 평가 시스템입니다.
Firebase Hosting으로 배포되며, Firestore를 통해 문제 데이터와 공지사항을 관리합니다.

**라이브 URL**: https://seoul-dc4d7.web.app
**마지막 배포**: 2026-04-06 00:00:00

---

## 주요 기능

- 과목별 CBT 문제 풀기 (소방, 구조, 구급, 안전, 시설, 장비)
- 관리자 공지사항 등록 및 관리
- Firestore 기반 실시간 데이터 동기화
- 모바일 반응형 UI

## 배포 방법

### 로컬에서 직접 배포 (권장)

```bash
bash deploy.sh "커밋 메시지"
```

이 스크립트는 README 배포일 갱신 → git commit/push → firebase deploy 를 순서대로 실행합니다.

### GitHub push 시 자동 배포

`main` 브랜치에 push하면 GitHub Actions가 자동으로 Firebase에 배포합니다.
단, `deploy.sh`로 만든 커밋(`[skip ci]` 포함)은 중복 배포를 막기 위해 스킵됩니다.

> **초기 설정 필요**: GitHub 저장소 Settings → Secrets에 `FIREBASE_TOKEN` 추가
> 토큰 발급: `firebase login:ci`

## 프로젝트 구조

```
public/
  index.html        # 메인 앱
  data/             # 과목별 문제 JSON
firebase.json       # Firebase 설정
firestore.rules     # Firestore 보안 규칙
firestore.indexes.json
deploy.sh           # 배포 스크립트
```
