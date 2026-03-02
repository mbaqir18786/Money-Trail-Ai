# Run ML service using the venv Python (avoids "No module named uvicorn")
& "$PSScriptRoot\.venv\Scripts\python.exe" -m uvicorn main:app --port 8000
