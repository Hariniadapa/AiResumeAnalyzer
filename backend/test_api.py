import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

api_key = os.getenv("OPENAI_API_KEY")
print(f"API Key: {api_key}")

client = OpenAI(api_key=api_key)

try:
    print("Testing gpt-4o-mini...")
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": "Hi"}],
        max_tokens=5
    )
    print(f"gpt-4o-mini response: {response.choices[0].message.content}")
except Exception as e:
    print(f"gpt-4o-mini failed: {e}")
    try:
        print("Testing gpt-3.5-turbo...")
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Hi"}],
            max_tokens=5
        )
        print(f"gpt-3.5-turbo response: {response.choices[0].message.content}")
    except Exception as e2:
        print(f"gpt-3.5-turbo failed: {e2}")
