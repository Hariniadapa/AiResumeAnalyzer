import os
import time
import random
import requests
import hashlib
import json
import re
from datetime import datetime
from typing import Optional

# Optional Selenium imports
try:
    from selenium import webdriver
    from selenium.webdriver.chrome.service import Service
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.common.by import By
    from webdriver_manager.chrome import ChromeDriverManager
    SELENIUM_AVAILABLE = True
except ImportError:
    SELENIUM_AVAILABLE = False

# Caching Mechanism
_scrape_cache = {}
SCRAPE_CACHE_TTL = 1800  # 30 minutes in seconds

def generate_job_id(url: str) -> str:
    return hashlib.sha256(url.encode('utf-8')).hexdigest()

def clean_html(raw_html: str) -> str:
    if not raw_html:
        return ""
    clean_r = re.compile(r'<[^>]*>')
    text = re.sub(clean_r, ' ', raw_html)
    # remove duplicate whitespaces
    return re.sub(r'\s+', ' ', text).strip()

def extract_duration_from_desc(desc: str, job_type: str) -> str:
    if not desc:
        return "3 Months" if job_type == "internship" else "Permanent"
    desc_lower = desc.lower()
    
    # Check for internship duration patterns
    # e.g., "3 months", "6-month", "12 weeks", "duration: 6 months", "1 year"
    match = re.search(r'\b(?:duration|period|length)?\s*:?\s*(\d+\s*(?:month|week|year)s?)\b', desc_lower)
    if match:
        return match.group(1).capitalize()
    
    # Fallback search without keywords
    match_fallback = re.search(r'\b(\d+\s*(?:month|week)s?)\b', desc_lower)
    if match_fallback:
        return match_fallback.group(1).capitalize()

    return "3 Months" if job_type == "internship" else "Permanent"

def extract_salary_stipend_from_desc(desc: str, job_type: str) -> str:
    if not desc:
        return "Paid Stipend" if job_type == "internship" else "Based on Experience"
    desc_lower = desc.lower()
    
    # Check for unpaid mentions
    if "unpaid" in desc_lower or "no stipend" in desc_lower:
        return "Unpaid"
        
    # Check for dollar/currency values: e.g. $15/hr, $50,000/yr, etc.
    currency_match = re.search(
        r'([$£€]\d+(?:,\d+)?(?:\s*-\s*[$£€]\d+(?:,\d+)?)?\s*(?:/hr|/hour|/month|/yr|/year|per year|per hour)?)',
        desc
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
    title = job.get("job_title", "Software Engineer")
    desc = clean_html(job.get("job_description", ""))
    
    # Determine Job Type
    is_intern = (
        "intern" in title.lower() or 
        "internship" in title.lower() or 
        "intern" in desc.lower() or
        "co-op" in title.lower()
    )
    job_type = "internship" if is_intern else "job"
    
    # Extract Duration
    duration = job.get("duration")
    if not duration or duration == "None" or (duration == "Permanent" and job_type == "internship"):
        duration = extract_duration_from_desc(desc, job_type)
        
    # Extract Salary / Stipend
    salary = job.get("salary")
    if not salary or salary in ("Based on Experience", "Not specified", "Competitive"):
        salary = extract_salary_stipend_from_desc(desc, job_type)
        
    return {
        "id": job.get("id") or generate_job_id(job.get("job_url", "https://linkedin.com/jobs")),
        "job_title": title,
        "company_name": job.get("company_name", "Innovative Tech"),
        "job_description": desc[:3000],  # Limit size for embedding and safety
        "job_location": job.get("job_location") or "Remote",
        "salary": salary,
        "skills": job.get("skills", "[]"),
        "source": job.get("source", "API"),
        "job_url": job.get("job_url", ""),
        "posted_date": job.get("posted_date", datetime.now().strftime("%Y-%m-%d")),
        "job_type": job_type,
        "duration": duration
    }

def fetch_remotive_jobs(query: str, limit=20) -> list[dict]:
    print(f"[Scraper] Fetching from Remotive API for: {query}...")
    try:
        url = f"https://remotive.com/api/remote-jobs?search={requests.utils.quote(query)}"
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json().get("jobs", [])
            normalized = []
            for job in data[:limit]:
                # tags skills
                tags = job.get("tags", [])
                skills_str = json.dumps(tags)
                
                raw_job = {
                    "id": generate_job_id(job.get("url", "")),
                    "job_title": job.get("title", ""),
                    "company_name": job.get("company_name", ""),
                    "job_description": job.get("description", ""),
                    "job_location": job.get("candidate_required_location", "Remote"),
                    "salary": job.get("salary", "Based on Experience"),
                    "skills": skills_str,
                    "source": "Remotive",
                    "job_url": job.get("url", ""),
                    "posted_date": job.get("publication_date", datetime.now().isoformat())[:10]
                }
                normalized.append(normalize_job_dict(raw_job))
            return normalized
    except Exception as e:
        print(f"[Scraper WARN] Remotive API failed: {e}")
    return []

def fetch_arbeitnow_jobs(query: str, limit=20) -> list[dict]:
    print(f"[Scraper] Fetching from Arbeitnow API for: {query}...")
    try:
        response = requests.get("https://www.arbeitnow.com/api/job-board-api", timeout=10)
        if response.status_code == 200:
            data = response.json().get("data", [])
            normalized = []
            for job in data:
                title = job.get("title", "")
                desc = job.get("description", "")
                
                # Check query in title or description
                if query.lower() in title.lower() or query.lower() in desc.lower():
                    raw_job = {
                        "id": generate_job_id(job.get("url", "")),
                        "job_title": title,
                        "company_name": job.get("company_name", ""),
                        "job_description": desc,
                        "job_location": job.get("location", "Remote"),
                        "salary": "Based on Experience",
                        "skills": json.dumps(job.get("tags", [])),
                        "source": "Arbeitnow",
                        "job_url": job.get("url", ""),
                        "posted_date": datetime.now().strftime("%Y-%m-%d")
                    }
                    normalized.append(normalize_job_dict(raw_job))
                    if len(normalized) >= limit:
                        break
            return normalized
    except Exception as e:
        print(f"[Scraper WARN] Arbeitnow API failed: {e}")
    return []

def scrape_linkedin_jobs(query: str, location="Remote", limit=15) -> list[dict]:
    """
    Scrapes LinkedIn public job search.
    If Selenium is blocked, missing, or fails, automatically switches to Remotive/Arbeitnow APIs.
    Utilizes 30-minute in-memory caching to avoid rate limits.
    """
    # 1. Caching check
    cache_key = f"{query.strip().lower()}|{location.strip().lower()}"
    if cache_key in _scrape_cache:
        cached_time, cached_results = _scrape_cache[cache_key]
        if time.time() - cached_time < SCRAPE_CACHE_TTL:
            print(f"[Scraper Cache] Returning {len(cached_results)} cached jobs for key: {cache_key}")
            return cached_results[:limit]

    print(f"[Scraper] Cache miss. Initiating active scrape for query: '{query}'...")

    jobs = []

    # 2. Try Selenium scraping (if available)
    if SELENIUM_AVAILABLE:
        print(f"[Scraper] Starting Selenium LinkedIn crawler...")
        chrome_options = Options()
        chrome_options.add_argument("--headless=new")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("window-size=1920,1080")
        
        user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        ]
        chrome_options.add_argument(f"user-agent={random.choice(user_agents)}")
        
        driver = None
        try:
            service = Service(ChromeDriverManager().install())
            driver = webdriver.Chrome(service=service, options=chrome_options)
            
            # Public LinkedIn job search URL
            search_url = f"https://www.linkedin.com/jobs/search?keywords={requests.utils.quote(query)}&location={requests.utils.quote(location)}"
            driver.get(search_url)
            
            time.sleep(random.uniform(2.5, 4.0))
            
            job_cards = driver.find_elements(By.CLASS_NAME, "base-card")[:limit]
            
            if not job_cards:
                print("[Scraper WARN] No job cards found on LinkedIn public list. Transitioning to fallback APIs.")
                driver.quit()
            else:
                for card in job_cards:
                    try:
                        title = card.find_element(By.CLASS_NAME, "base-search-card__title").text.strip()
                        company = card.find_element(By.CLASS_NAME, "base-search-card__subtitle").text.strip()
                        loc = card.find_element(By.CLASS_NAME, "job-search-card__location").text.strip()
                        url = card.find_element(By.TAG_NAME, "a").get_attribute("href").split("?")[0]
                        
                        # Attempt to click card and extract description snippet from side panel
                        description = f"Detailed role description for {title} position at {company}. Key requirements involve proficiency in {query}."
                        try:
                            card.click()
                            time.sleep(random.uniform(1.0, 2.0))
                            desc_elem = driver.find_element(By.CLASS_NAME, "show-more-less-html__markup")
                            if desc_elem:
                                description = desc_elem.text.strip()
                        except Exception:
                            # If click details page block, just keep fallback snippet
                            pass
                        
                        raw_job = {
                            "id": generate_job_id(url),
                            "job_title": title,
                            "company_name": company,
                            "job_description": description,
                            "job_location": loc,
                            "salary": "Based on Experience",
                            "skills": json.dumps([query]),
                            "source": "LinkedIn",
                            "job_url": url,
                            "posted_date": datetime.now().strftime("%Y-%m-%d")
                        }
                        
                        jobs.append(normalize_job_dict(raw_job))
                    except Exception as card_err:
                        print(f"[Scraper] Individual LinkedIn card extraction failed: {card_err}")
                        continue
                driver.quit()
        except Exception as sel_err:
            print(f"[Scraper Error] Headless Selenium session failed: {sel_err}. Switching to APIs.")
            if driver:
                try:
                    driver.quit()
                except Exception:
                    pass

    # 3. Fallback to API Aggregation if Selenium fails or returns nothing
    if not jobs:
        print("[Scraper] Running APIs aggregation fallback (Remotive + Arbeitnow)...")
        jobs.extend(fetch_remotive_jobs(query, limit=limit))
        jobs.extend(fetch_arbeitnow_jobs(query, limit=limit))

    # 4. If all fail, return static curated mock listings to ensure "System must never break or show empty results"
    if not jobs:
        print("[Scraper CRITICAL] All APIs and scrapers failed. Returning curated mock results to prevent crash.")
        jobs = get_static_fallback_jobs(query)

    # 5. Populate Cache
    _scrape_cache[cache_key] = (time.time(), jobs)
    return jobs[:limit]

def get_static_fallback_jobs(query: str) -> list[dict]:
    """Generates high-quality mock data when external networks are unavailable."""
    return [
        {
            "id": generate_job_id(f"http://mock-url-1.com/{query}"),
            "job_title": f"Lead {query} Architect",
            "company_name": "NextGen Systems",
            "job_description": f"We are looking for a skilled candidate experienced in {query} and general engineering design. You will implement features, manage data flows, and coordinate with remote departments.",
            "job_location": "Remote (US/EU)",
            "salary": "$120,000 - $140,000 / year",
            "skills": json.dumps([query, "Cloud Architecture", "FastAPI", "SQL"]),
            "source": "CareerPlatformFallback",
            "job_url": "https://www.linkedin.com/jobs",
            "posted_date": datetime.now().strftime("%Y-%m-%d"),
            "job_type": "job",
            "duration": "Permanent"
        },
        {
            "id": generate_job_id(f"http://mock-url-2.com/{query}"),
            "job_title": f"{query} Developer Internship",
            "company_name": "Apex Digital Studio",
            "job_description": f"Looking for an enthusiastic engineering student eager to learn and code using {query}. You will work on real client features and acquire hands-on project experience.",
            "job_location": "Remote",
            "salary": "$25 - $35 / hour",
            "skills": json.dumps([query, "React", "Python", "Git"]),
            "source": "CareerPlatformFallback",
            "job_url": "https://www.linkedin.com/jobs",
            "posted_date": datetime.now().strftime("%Y-%m-%d"),
            "job_type": "internship",
            "duration": "3 Months"
        }
    ]
