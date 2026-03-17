import json
import pathlib
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import requests

CONFIG_PATH = pathlib.Path("/home/calo/.openclaw/shared/integrations/buffer_config.json")
QUEUE_PATH = pathlib.Path("/home/calo/.openclaw/shared/marketing/buffer_publish_queue.jsonl")
LOG_PATH = pathlib.Path("/home/calo/.openclaw/shared/marketing/published_posts.md")

BUFFER_GRAPHQL_URL = "https://api.buffer.com"

CREATE_POST_MUTATION = """
mutation CreatePost($input: CreatePostInput!) {
  createPost(input: $input) {
    __typename
    ... on PostActionSuccess {
      post {
        id
        text
        createdAt
      }
    }
    ... on MutationError {
      message
    }
  }
}
"""


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def load_json(path: pathlib.Path) -> Dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def load_queue(path: pathlib.Path) -> List[Dict[str, Any]]:
    if not path.exists():
        return []

    items: List[Dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as f:
        for line_number, line in enumerate(f, start=1):
            line = line.strip()
            if not line:
                continue
            try:
                items.append(json.loads(line))
            except json.JSONDecodeError as exc:
                raise ValueError(f"Invalid JSON on line {line_number} of {path}: {exc}") from exc
    return items


def write_queue(path: pathlib.Path, items: List[Dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8") as f:
        for item in items:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")


def append_log(message: str) -> None:
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not LOG_PATH.exists():
        with LOG_PATH.open("w", encoding="utf-8") as f:
            f.write("# Published Posts Log\n")
    with LOG_PATH.open("a", encoding="utf-8") as f:
        f.write(message.rstrip() + "\n")


def resolve_channel_id(item: Dict[str, Any], config: Dict[str, Any]) -> str:
    if item.get("channel_id"):
        return str(item["channel_id"])

    platform = item.get("platform")
    if not platform:
        raise ValueError("Queue item is missing both 'channel_id' and 'platform'.")

    normalized_platform = str(platform).strip().lower()

    aliases = {
        "twitter": "x",
        "x": "x",
        "linkedin": "linkedin",
        "linkedin profile": "linkedin",
        "linkedin page": "linkedin",
    }

    normalized_platform = aliases.get(normalized_platform, normalized_platform)

    channels = config.get("channels", {})
    if normalized_platform not in channels:
        raise ValueError(
            f"No channel configured for platform '{platform}'. "
            f"Expected config['channels']['{normalized_platform}']."
        )

    return str(channels[normalized_platform])

def normalize_text(item: Dict[str, Any]) -> str:
    text = item.get("text", "") or item.get("content", "")
    text = str(text).strip()

    url = str(item.get("url", "")).strip()
    if url and url not in text:
        text = f"{text}\n\n{url}" if text else url

    if not text:
        raise ValueError("Queue item has no post text.")

    return text

def create_buffer_post(
    token: str,
    channel_id: str,
    text: str,
    scheduling_type: str = "automatic",
    mode: str = "addToQueue",
) -> Dict[str, Any]:
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
    }

    payload = {
        "query": CREATE_POST_MUTATION,
        "variables": {
            "input": {
                "text": text,
                "channelId": channel_id,
                "schedulingType": scheduling_type,
                "mode": mode,
            }
        },
    }

    response = requests.post(
        BUFFER_GRAPHQL_URL,
        headers=headers,
        json=payload,
        timeout=30,
    )

    content_type = response.headers.get("content-type", "")
    if "application/json" not in content_type.lower():
        raise RuntimeError(
            f"Buffer returned non-JSON response: {response.status_code} {content_type} "
            f"{response.text[:500]}"
        )

    data = response.json()

    if response.status_code >= 400:
        raise RuntimeError(f"Buffer HTTP error {response.status_code}: {json.dumps(data, ensure_ascii=False)}")

    if data.get("errors"):
        raise RuntimeError(f"Buffer GraphQL errors: {json.dumps(data['errors'], ensure_ascii=False)}")

    create_post = data.get("data", {}).get("createPost")
    if not create_post:
        raise RuntimeError(f"Buffer response missing data.createPost: {json.dumps(data, ensure_ascii=False)}")

    typename = create_post.get("__typename")

    if typename in {"MutationError", "UnexpectedError"}:
        raise RuntimeError(
            f"Buffer post rejected ({typename}): {create_post.get('message', 'Unknown error')}"
    )

    if typename != "PostActionSuccess":
        raise RuntimeError(
            f"Unexpected Buffer response type: {typename} | {json.dumps(data, ensure_ascii=False)}"
    )

    post = create_post.get("post")
    if not post:
        raise RuntimeError(f"Buffer success response missing post object: {json.dumps(data, ensure_ascii=False)}")

    return post


def process_queue() -> None:
    config = load_json(CONFIG_PATH)
    token = str(config.get("buffer_api_token", "")).strip()
    if not token:
        raise ValueError("buffer_api_token is missing from buffer_config.json")

    items = load_queue(QUEUE_PATH)
    updated_items: List[Dict[str, Any]] = []

    for item in items:
        status = str(item.get("status", "")).upper().strip()
        if status != "PENDING":
            updated_items.append(item)
            continue

        product = str(item.get("product", "UNKNOWN_PRODUCT"))
        platform = str(item.get("platform", "unknown"))
        created_at = str(item.get("created_at", utc_now_iso()))

        try:
            channel_id = resolve_channel_id(item, config)
            text = normalize_text(item)

            post = create_buffer_post(
                token=token,
                channel_id=channel_id,
                text=text,
                scheduling_type=str(item.get("scheduling_type", "automatic")),
                mode=str(item.get("mode", "addToQueue")),
            )

            item["status"] = "SCHEDULED"
            item["scheduled_at"] = utc_now_iso()
            item["channel_id"] = channel_id
            item["buffer_post_id"] = post.get("id")
            item["buffer_post_text"] = post.get("text", text)

            append_log(
                "POST | "
                f"Product: {product} | "
                f"Platform: {platform} | "
                f"Status: SCHEDULED | "
                f"Created: {created_at} | "
                f"Scheduled: {item['scheduled_at']} | "
                f"BufferPostID: {item.get('buffer_post_id', 'UNKNOWN')}"
            )

        except Exception as exc:
            item["status"] = "FAILED"
            item["failed_at"] = utc_now_iso()
            item["error"] = str(exc)

            append_log(
                "POST | "
                f"Product: {product} | "
                f"Platform: {platform} | "
                f"Status: FAILED | "
                f"Created: {created_at} | "
                f"Failed: {item['failed_at']} | "
                f"Error: {item['error']}"
            )

        updated_items.append(item)

    write_queue(QUEUE_PATH, updated_items)


if __name__ == "__main__":
    process_queue()