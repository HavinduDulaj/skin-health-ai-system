"""Start Derma-Safe AI (API + legacy web UI in one process).

    python serve.py

Mobile app (recommended):

    python -m backend
    cd services/ingredients && npm start   # optional ingredient KB
    cd mobile && npx expo start

Legacy browser demo:

    python -m backend
    python -m frontend
"""

from backend.__main__ import main

if __name__ == "__main__":
    main()
