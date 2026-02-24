@echo off
echo ====================================
echo   CBT 시스템 서버 시작
echo ====================================
echo.
echo 서버를 시작합니다...
echo 브라우저가 자동으로 열립니다.
echo.
echo [종료하려면 Ctrl+C를 누르세요]
echo.

cd /d "%~dp0public"

echo Node.js가 설치되어 있는지 확인 중...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo [오류] Node.js가 설치되어 있지 않습니다!
    echo.
    echo Node.js를 설치해주세요:
    echo 1. https://nodejs.org 접속
    echo 2. LTS 버전 다운로드 및 설치
    echo 3. 설치 후 이 파일을 다시 실행
    echo.
    pause
    exit /b
)

echo.
echo ====================================
echo   서버 주소: http://localhost:8000
echo ====================================
echo.
echo 브라우저에서 다음 주소로 접속하세요:
echo http://localhost:8000/login.html
echo.

start http://localhost:8000/login.html

npx http-server -p 8000 -c-1

pause
