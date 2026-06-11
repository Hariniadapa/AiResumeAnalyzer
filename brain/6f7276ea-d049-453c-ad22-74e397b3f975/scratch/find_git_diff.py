import subprocess

try:
    output = subprocess.check_output(
        ["git", "log", "-S", "renderJobCard", "-p"],
        cwd="c:/Users/SAMA/OneDrive/Desktop/AIRESUME_NEW",
        text=True,
        encoding="utf-8"
    )
    # Search for the definition 'const renderJobCard' or 'function renderJobCard' in the diff
    lines = output.splitlines()
    for i, line in enumerate(lines):
        if "renderJobCard" in line and ("const" in line or "function" in line or "=>" in line):
            print(f"Found on line {i}:")
            # print surrounding lines
            for j in range(max(0, i-5), min(len(lines), i+30)):
                print(lines[j])
            print("="*40)
except Exception as e:
    print("Error:", e)
