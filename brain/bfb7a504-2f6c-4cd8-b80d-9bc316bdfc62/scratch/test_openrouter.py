import os
import sys
from dotenv import load_dotenv
from openai import OpenAI

backend_dir = r"c:\Users\SAMA\OneDrive\Desktop\AIRESUME_NEW\backend"
load_dotenv(os.path.join(backend_dir, ".env"))

api_key = os.getenv("OPENROUTER_API_KEY")
base_url = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")

client = OpenAI(
    api_key=api_key,
    base_url=base_url,
)

model = "meta-llama/llama-3.3-70b-instruct:free"
print(f"Testing model: {model}...")
try:
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "user", "content": "Success check. Answer in one word: Success."}
        ],
        max_tokens=10
    )
    print(f"Result: {response.choices[0].message.content}")
    print("Success!")
except Exception as e:
    print(f"Failed: {e}")
