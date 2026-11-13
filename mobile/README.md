# EthioAlert Citizen App (Flutter)

Beautiful citizen app connected to the Django backend (`:8081`) and EthioAlert AI (via backend proxy).

## Features

- Phone OTP sign-in (`/api/v1/auth/phone/*`)
- Live regional alerts (`/api/v1/alerts/mine`)
- SOS submit with map + GPS (`/api/v1/sos/submit`)
- My reports (`/api/v1/cases`)
- Citizen EthioAlert AI chat (`/api/v1/ai/assist`)

## Run

```powershell
cd mobile
flutter pub get
flutter run --dart-define=API_BASE=http://127.0.0.1:8081
```

Android emulator:

```powershell
flutter run --dart-define=API_BASE=http://10.0.2.2:8081
```

Start backend + AI first:

```powershell
# backend
cd backend
py -3 manage.py runserver 8081

# AI service
cd Ai
uvicorn app.main:app --port 8088
```
