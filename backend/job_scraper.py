import os
import time
import requests
import hashlib
import json
import re
from datetime import datetime
from typing import Optional

# Caching Mechanisms
_scrape_cache = {}
_url_validation_cache = {}
SCRAPE_CACHE_TTL = 1800  # 30 minutes

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

def generate_job_id(url: str) -> str:
    return hashlib.sha256(url.encode("utf-8")).hexdigest()

def clean_html(raw_html: str) -> str:
    if not raw_html:
        return ""
    clean_r = re.compile(r"<[^>]*>")
    text = re.sub(clean_r, " ", raw_html)
    return re.sub(r"\s+", " ", text).strip()

def is_url_valid(url: str) -> bool:
    """Validates that a URL is reachable, formatted properly, and not a broken/404 link."""
    if not url or not isinstance(url, str):
        return False
    url_trimmed = url.strip()
    if not url_trimmed.startswith(("http://", "https://")):
        return False
    # Exclude generic landing pages
    if url_trimmed.rstrip("/") in (
        "https://www.linkedin.com/jobs",
        "https://linkedin.com/jobs",
        "http://www.linkedin.com/jobs",
        "http://linkedin.com/jobs",
    ):
        return False

    # Instant validation for valid LinkedIn job posting URLs from LinkedIn guest API
    if "linkedin.com/jobs/view/" in url_trimmed:
        return True

    if url_trimmed in _url_validation_cache:
        return _url_validation_cache[url_trimmed]

    try:
        res = requests.head(url_trimmed, headers=HEADERS, allow_redirects=True, timeout=2)
        if res.status_code in (403, 405):
            res = requests.get(url_trimmed, headers=HEADERS, stream=True, allow_redirects=True, timeout=2)
        valid = res.status_code < 400
    except Exception:
        valid = False

    _url_validation_cache[url_trimmed] = valid
    return valid

def extract_duration_from_desc(desc: str, job_type: str) -> str:
    if not desc:
        return "3 Months" if job_type == "internship" else "Permanent"
    desc_lower = desc.lower()
    match = re.search(r"\b(?:duration|period|length)?\s*:?\s*(\d+\s*(?:month|week|year)s?)\b", desc_lower)
    if match:
        return match.group(1).capitalize()
    match_fallback = re.search(r"\b(\d+\s*(?:month|week)s?)\b", desc_lower)
    if match_fallback:
        return match_fallback.group(1).capitalize()
    return "3 Months" if job_type == "internship" else "Permanent"

def extract_salary_stipend_from_desc(desc: str, job_type: str) -> str:
    if not desc:
        return "Paid Stipend" if job_type == "internship" else "Based on Experience"
    desc_lower = desc.lower()
    if "unpaid" in desc_lower or "no stipend" in desc_lower:
        return "Unpaid"
    currency_match = re.search(
        r"([$£€]\d+(?:,\d+)?(?:\s*-\s*[$£€]\d+(?:,\d+)?)?\s*(?:/hr|/hour|/month|/yr|/year|per year|per hour)?)",
        desc,
    )
    if currency_match:
        return currency_match.group(1)
    if job_type == "internship":
        if "stipend" in desc_lower or "paid" in desc_lower:
            return "Paid Stipend"
        return "Stipend Available"
    return "Based on Experience"

def normalize_job_dict(job: dict) -> dict:
    """Standardizes job details ensuring duration, job_type, salary/stipend are clean."""
    title = job.get("job_title") or "Software Engineer"
    company_name = job.get("company_name") or "Tech Organization"
    desc = clean_html(job.get("job_description", ""))

    is_intern = (
        "intern" in title.lower()
        or "internship" in title.lower()
        or "co-op" in title.lower()
        or job.get("job_type") == "internship"
    )
    job_type = "internship" if is_intern else "job"

    duration = job.get("duration")
    if not duration or duration == "None" or (duration == "Permanent" and job_type == "internship"):
        duration = extract_duration_from_desc(desc, job_type)

    salary = job.get("salary")
    if not salary or salary in ("Based on Experience", "Not specified", "Competitive"):
        salary = extract_salary_stipend_from_desc(desc, job_type)

    return {
        "id": job.get("id") or generate_job_id(job.get("job_url", title + company_name)),
        "job_title": title,
        "company_name": company_name,
        "job_description": desc[:3000] if desc else f"{title} position at {company_name}.",
        "job_location": job.get("job_location") or "Remote",
        "salary": salary,
        "skills": job.get("skills", "[]"),
        "source": job.get("source", "LinkedIn"),
        "job_url": job.get("job_url", ""),
        "posted_date": job.get("posted_date", datetime.now().strftime("%Y-%m-%d")),
        "job_type": job_type,
        "duration": duration,
    }

def fetch_linkedin_guest_jobs(
    query: str, location: str = "Remote", is_internship: bool = False, limit: int = 15
) -> list[dict]:
    """Fetches real jobs directly from LinkedIn's public guest API endpoint."""
    search_keywords = query.strip()
    if is_internship and "intern" not in search_keywords.lower():
        search_keywords += " internship"

    url = (
        f"https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search"
        f"?keywords={requests.utils.quote(search_keywords)}&location={requests.utils.quote(location)}&start=0"
    )

    print(f"[LinkedIn Fetch] Querying LinkedIn API: '{search_keywords}' ({location})...")
    try:
        res = requests.get(url, headers=HEADERS, timeout=8)
        if res.status_code != 200:
            print(f"[LinkedIn WARN] LinkedIn API returned status {res.status_code}")
            return []

        html = res.text
        cards = html.split("</li>")
        results = []

        for c in cards:
            if "base-search-card" not in c:
                continue

            # Extract Title
            t_match = re.search(r'class="base-search-card__title"[^>]*>\s*(.*?)\s*</h3', c, re.DOTALL)
            title = clean_html(t_match.group(1)) if t_match else ""

            # Extract Company
            comp_match = re.search(
                r'class="base-search-card__subtitle"[^>]*>.*?>(.*?)</a>|class="base-search-card__subtitle"[^>]*>\s*(.*?)\s*</h4',
                c,
                re.DOTALL,
            )
            company = ""
            if comp_match:
                company = clean_html(comp_match.group(1) or comp_match.group(2) or "")

            # Extract Location
            loc_match = re.search(r'class="job-search-card__location"[^>]*>\s*(.*?)\s*</span', c, re.DOTALL)
            loc = clean_html(loc_match.group(1)) if loc_match else location

            # Extract Link
            link_match = re.search(r'href="(https://[a-z]+\.linkedin\.com/jobs/view/[^"\?]+)', c)
            link = link_match.group(1) if link_match else ""

            if title and link:
                role_type = (
                    "internship"
                    if (is_internship or "intern" in title.lower() or "internship" in title.lower())
                    else "job"
                )
                raw_job = {
                    "id": generate_job_id(link),
                    "job_title": title,
                    "company_name": company or "LinkedIn Enterprise",
                    "job_description": f"{title} position at {company}. View full role requirements and apply on LinkedIn.",
                    "job_location": loc or "Remote",
                    "salary": "Paid Stipend" if role_type == "internship" else "Based on Experience",
                    "skills": json.dumps([query]),
                    "source": "LinkedIn",
                    "job_url": link,
                    "posted_date": datetime.now().strftime("%Y-%m-%d"),
                    "job_type": role_type,
                    "duration": "3 Months" if role_type == "internship" else "Permanent",
                }
                normalized = normalize_job_dict(raw_job)

                # Validate URL before accepting
                if is_url_valid(normalized["job_url"]):
                    results.append(normalized)

                if len(results) >= limit:
                    break

        print(f"[LinkedIn Fetch] Retrieved {len(results)} valid LinkedIn listings for '{search_keywords}'.")
        return results

    except Exception as e:
        print(f"[LinkedIn WARN] Exception during LinkedIn fetch: {e}")
        return []

def scrape_linkedin_jobs(query: str, location="Remote", limit=25) -> list[dict]:
    """
    Main job collection entry point.
    Searches real LinkedIn postings for both full-time jobs and internships.
    """
    clean_q = query.strip()
    cache_key = f"{clean_q.lower()}|{location.strip().lower()}"
    if cache_key in _scrape_cache:
        cached_time, cached_results = _scrape_cache[cache_key]
        if time.time() - cached_time < SCRAPE_CACHE_TTL:
            return cached_results[:limit]

    print(f"[Job Service] Gathering LinkedIn jobs and internships for query: '{clean_q}'...")
    all_jobs = []

    # 1. Search full-time LinkedIn jobs
    full_time_jobs = fetch_linkedin_guest_jobs(clean_q, location=location, is_internship=False, limit=15)
    all_jobs.extend(full_time_jobs)

    # 2. Search LinkedIn internships
    internship_jobs = fetch_linkedin_guest_jobs(clean_q, location=location, is_internship=True, limit=15)
    all_jobs.extend(internship_jobs)

    # Deduplicate by URL/ID
    seen_ids = set()
    unique_jobs = []
    for j in all_jobs:
        if j["id"] not in seen_ids and is_url_valid(j["job_url"]):
            seen_ids.add(j["id"])
            unique_jobs.append(j)

    _scrape_cache[cache_key] = (time.time(), unique_jobs)
    return unique_jobs[:limit]
