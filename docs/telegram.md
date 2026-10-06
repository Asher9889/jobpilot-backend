# Login:
```javascript
                    YOUR APPLICATION
                         │
                  User clicks
                "Connect Telegram"
                         │
                         ▼
                 Express Backend
                         │
                         │ auth.exportLoginToken
                         ▼
                  Telegram MTProto
                         │
                         │ loginToken
                         ▼
               tg://login?token=...
                         │
                         ▼
                  Generate QR
                         │
                         ▼
                  React Frontend
                         │
                         │ QR displayed
                         ▼
              ┌─────────────────────┐
              │ Telegram Mobile App │
              │                     │
              │ Scan QR             │
              │ Confirm Login       │
              └──────────┬──────────┘
                         │
                         │ auth.acceptLoginToken
                         ▼
                  Telegram servers
                         │
                         │ updateLoginToken
                         ▼
                 Your MTProto client
                         │
                         │ auth.exportLoginToken
                         ▼
              auth.loginTokenSuccess
                         │
                         ▼
                Telegram Session
                         │
                         ▼
                 Save session for
                 your application user
```