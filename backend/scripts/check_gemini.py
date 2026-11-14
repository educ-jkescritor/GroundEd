"""Check the Gemini API key in backend/.env and list usable text models. Never prints the key.

  uv run python scripts/check_gemini.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import config  # noqa: E402  (loads backend/.env)


def main() -> int:
    key = config.GEMINI_API_KEY
    if not key:
        print("GEMINI_API_KEY is empty. Put it in backend/.env (see backend/.env.example).")
        return 1
    print(f"Key found (ends with …{key[-4:]}). Configured model: {config.GEMINI_MODEL}")

    from google import genai
    from google.genai import errors

    client = genai.Client(api_key=key)
    try:
        models = [m for m in client.models.list() if "generateContent" in (m.supported_actions or [])]
    except errors.APIError as e:
        print(f"Gemini API rejected the request: HTTP {e.code} {e.status}: {e.message}")
        return 2
    names = sorted(m.name.removeprefix("models/") for m in models)
    print(f"{len(names)} models support text generation, e.g.:")
    for n in names:
        if "gemini" in n and ("flash" in n or "pro" in n):
            print("  ", n)
    if config.GEMINI_MODEL not in names:
        print(f"WARNING: configured model '{config.GEMINI_MODEL}' is not in the list; set GEMINI_MODEL in .env.")

    try:
        r = client.models.generate_content(model=config.GEMINI_MODEL, contents="Reply with the single word: ok")
        print(f"Test call to {config.GEMINI_MODEL}: {r.text.strip()!r}")
    except errors.APIError as e:
        print(f"Test call failed: HTTP {e.code} {e.status}: {e.message}")
        return 3
    return 0


if __name__ == "__main__":
    sys.exit(main())
