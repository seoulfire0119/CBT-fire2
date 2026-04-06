#!/bin/bash
# deploy.sh - README 갱신 + git push + firebase deploy

set -e

COMMIT_MSG="${1:-배포 업데이트}"
DEPLOY_DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "=== 배포 시작: $DEPLOY_DATE ==="
echo "커밋 메시지: $COMMIT_MSG"

# README.md 마지막 배포일 갱신
sed -i "s/\*\*마지막 배포\*\*:.*/**마지막 배포**: $DEPLOY_DATE/" README.md
echo "README.md 업데이트 완료"

# git commit & push
git add -A
if git diff --cached --quiet; then
  echo "변경사항 없음, 커밋 스킵"
else
  git commit -m "$COMMIT_MSG [skip ci]"
  git push origin main
  echo "GitHub push 완료"
fi

# Firebase 배포
echo "Firebase 배포 중..."
firebase deploy

echo "=== 배포 완료 ==="
