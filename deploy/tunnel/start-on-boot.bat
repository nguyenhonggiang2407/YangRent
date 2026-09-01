@echo off
REM ============================================================
REM  YangRent - Tự động chạy backend + tunnel khi bật máy
REM
REM  CÀI ĐẶT LẦN ĐẦU (chạy 1 lần):
REM     start-on-boot.bat install
REM  -> tạo shortcut trong thư mục Startup để Windows tự chạy
REM
REM  SAU KHI BẬT MÁY (tự động):
REM  Khởi động backend, mở tunnel, build frontend,
REM  và copy file cần upload ra Desktop.
REM ============================================================
cd /d "%~dp0..\.."

if /i "%1"=="install" (
  powershell -NoProfile -Command "$w=New-Object -ComObject WScript.Shell; $s=$w.CreateShortcut([Environment]::GetFolderPath('Startup')+'\TroflowAutoStart.lnk'); $s.TargetPath='%~f0'; $s.WorkingDirectory='%~dp0..\..'; $s.WindowStyle=1; $s.Save()"
  echo.
  echo Da tao shortcut tu chay khi bat may.
  echo Kiem tra: Win+R -^> shell:startup -^> phai co TroflowAutoStart.lnk
  pause
  exit /b
)

set "BASH=C:\Program Files\Git\bin\bash.exe"
if not exist "%BASH%" set "BASH=C:\Program Files\Git\usr\bin\bash.exe"
if not exist "%BASH%" (
  echo KHONG TIM THAY GIT BASH. Cai Git Bash roi thu lai.
  pause
  exit /b
)

"%BASH%" deploy/tunnel/start-all.sh
pause
