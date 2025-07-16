import os
import re
import requests
from bs4 import BeautifulSoup
from markdownify import markdownify as md
from transliterate import translit


def download_page_to_markdown(url, mdx_path, img_dir="public/from-carrot-images"):
    os.makedirs(os.path.dirname(mdx_path), exist_ok=True)
    os.makedirs(img_dir, exist_ok=True)

    response = requests.get(url)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")

    # Скачиваем все картинки и заменяем src на локальные пути
    for img in soup.find_all("img"):
        img_url = img.get("src")
        if not img_url:
            continue
        img_url_full = requests.compat.urljoin(url, img_url)
        img_name = re.sub(r"[^a-zA-Z0-9_.-]", "_", os.path.basename(img_url_full))
        img_path = os.path.join(img_dir, img_name)
        if not os.path.exists(img_path):
            try:
                img_data = requests.get(img_url_full).content
                with open(img_path, "wb") as f:
                    f.write(img_data)
                img["src"] = f"/from-carrot-images/{img_name}"
            except Exception as e:
                print(f"Ошибка при скачивании {img_url_full}: {e}")
        else:
            img["src"] = f"/from-carrot-images/{img_name}"

    # Преобразуем HTML в Markdown
    markdown = md(str(soup), strip=["script", "style"])

    # Сохраняем markdown
    with open(mdx_path, "w", encoding="utf-8") as f:
        f.write(markdown)
    print(f"Сохранено: {mdx_path}")


def main():
    import sys
    if len(sys.argv) < 3:
        print("Usage: python download_carrot_page.py <url> <mdx_path> [--images-to <img_dir>]")
        return
    url = sys.argv[1]
    mdx_path = sys.argv[2]
    img_dir = "public/from-carrot-images"
    if "--images-to" in sys.argv:
        idx = sys.argv.index("--images-to")
        if idx + 1 < len(sys.argv):
            img_dir = sys.argv[idx + 1]
    download_page_to_markdown(url, mdx_path, img_dir)

if __name__ == "__main__":
    main() 