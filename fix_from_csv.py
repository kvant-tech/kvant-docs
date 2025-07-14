import csv
import os
import re
from pathlib import Path
from fix_mdx_formatting import html_to_md

CSV_PATH = 'public/help_articles_ru_updated.csv'
MDX_DIRS = [
    'content/ru/reference/references',
    'content/ru/reference/communications',
]

# Словарь: slug -> [html_chunks]
def collect_articles_from_csv():
    articles = {}
    with open(CSV_PATH, encoding='utf-8') as f:
        reader = csv.reader(f)
        for row in reader:
            if len(row) < 3:
                continue
            slug = row[1].strip()
            html = row[3].strip() if len(row) > 3 else ''
            if not slug:
                continue
            if slug not in articles:
                articles[slug] = []
            articles[slug].append(html)
    return articles

def find_mdx_file(slug):
    for d in MDX_DIRS:
        path = os.path.join(d, f'{slug}.mdx')
        if os.path.exists(path):
            return path
    return None

def replace_mdx_content(slug, md_content):
    mdx_path = find_mdx_file(slug)
    if not mdx_path:
        print(f'Файл для {slug} не найден')
        return
    # Сохраняем frontmatter
    with open(mdx_path, 'r', encoding='utf-8') as f:
        content = f.read()
    if content.startswith('---'):
        fm_end = content.find('---', 3)
        if fm_end != -1:
            fm_end += 3
            frontmatter = content[:fm_end]
            new_content = frontmatter + '\n' + md_content.strip() + '\n'
        else:
            new_content = md_content.strip() + '\n'
    else:
        new_content = md_content.strip() + '\n'
    with open(mdx_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f'Обновлен: {mdx_path}')

def main():
    articles = collect_articles_from_csv()
    for slug, html_chunks in articles.items():
        html = '\n'.join(html_chunks)
        md = html_to_md(html)
        replace_mdx_content(slug, md)

if __name__ == '__main__':
    main() 