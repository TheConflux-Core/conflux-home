#!/usr/bin/env python3
"""
Tavily search fallback script.
Use when Brave Search hits rate limits.

Usage:
    python3 scripts/tavily_search.py "search query here"
    python3 scripts/tavily_search.py "search query" --max-results 10
    python3 scripts/tavily_search.py "search query" --depth advanced

Output: JSON with results array (title, url, snippet).
"""

import json
import os
import sys
import urllib.request
import urllib.error

TAVILY_API_URL = "https://api.tavily.com/search"


def search(query: str, max_results: int = 5, search_depth: str = "basic") -> dict:
    api_key = os.environ.get("TAVILY_API_KEY", "")
    if not api_key:
        return {"error": "TAVILY_API_KEY not set", "results": []}

    payload = json.dumps({
        "query": query,
        "max_results": max_results,
        "search_depth": search_depth,
        "include_answer": True,
        "include_raw_content": False,
    }).encode("utf-8")

    req = urllib.request.Request(
        TAVILY_API_URL,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return {
                "query": query,
                "answer": data.get("answer", ""),
                "results": [
                    {
                        "title": r.get("title", ""),
                        "url": r.get("url", ""),
                        "snippet": r.get("content", ""),
                    }
                    for r in data.get("results", [])
                ],
            }
    except urllib.error.HTTPError as e:
        return {"error": f"HTTP {e.code}: {e.reason}", "results": []}
    except Exception as e:
        return {"error": str(e), "results": []}


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 tavily_search.py 'query' [--max-results N] [--depth basic|advanced]")
        sys.exit(1)

    query = sys.argv[1]
    max_results = 5
    depth = "basic"

    i = 2
    while i < len(sys.argv):
        if sys.argv[i] == "--max-results" and i + 1 < len(sys.argv):
            max_results = int(sys.argv[i + 1])
            i += 2
        elif sys.argv[i] == "--depth" and i + 1 < len(sys.argv):
            depth = sys.argv[i + 1]
            i += 2
        else:
            i += 1

    result = search(query, max_results, depth)
    print(json.dumps(result, indent=2))
