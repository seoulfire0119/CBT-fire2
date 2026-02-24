@echo off
echo ====================================
echo   CBT 시스템 로컬 서버 시작
echo ====================================
echo.
echo 방법을 선택하세요:
echo.
echo [주의] 로컬 파일로 직접 열면 Firebase 연결이 안 됩니다!
echo        반드시 웹 서버를 통해 실행해야 합니다.
echo.
echo ====================================
echo   권장 방법: VS Code Live Server
echo ====================================
echo.
echo 1. VS Code 실행
echo 2. Extensions에서 "Live Server" 설치
echo 3. public/login.html 우클릭
echo 4. "Open with Live Server" 선택
echo.
echo ====================================
echo   대안 방법들
echo ====================================
echo.
echo A. Node.js 설치 후 실행:
echo    1) https://nodejs.org 에서 Node.js 다운로드
echo    2) 설치 후 명령어 실행:
echo       cd public
echo       npx http-server -p 8000
echo.
echo B. Python 설치 후 실행:
echo    1) https://python.org 에서 Python 다운로드
echo    2) 설치 후 명령어 실행:
echo       cd public
echo       python -m http.server 8000
echo.
echo C. Firebase Hosting 사용:
echo    1) npm install -g firebase-tools
echo    2) firebase serve
echo.
pause
