@echo off
setlocal
cd /d "%~dp0"
echo [1/3] Installing packaging tools...
python -m pip install -r requirements-build.txt
if errorlevel 1 goto :error
echo [2/3] Building single-file Windows app...
python -m PyInstaller --noconfirm --clean H3PromptStudio-v0.6.1.spec
if errorlevel 1 goto :error
echo [3/3] Complete: dist\H3PromptStudio-v0.6.1.exe
pause
exit /b 0
:error
echo Build failed. Check Python and pip, then try again.
pause
exit /b 1
