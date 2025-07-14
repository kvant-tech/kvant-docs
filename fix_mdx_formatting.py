import os
import re
from pathlib import Path

# Папки для обработки
TARGET_DIRS = [
    'content/ru/reference/references',
    'content/ru/reference/communications',
]

# Регулярки для замены
IMG_TAG = re.compile(r'<img [^>]*src=["\\\']([^"\\\']+)["\\\'][^>]*>', re.IGNORECASE)
P_TAG = re.compile(r'<p[^>]*>(.*?)</p>', re.IGNORECASE | re.DOTALL)
LI_TAG = re.compile(r'<li[^>]*>(.*?)</li>', re.IGNORECASE | re.DOTALL)
B_TAG = re.compile(r'<(b|strong)>(.*?)</\1>', re.IGNORECASE | re.DOTALL)
I_TAG = re.compile(r'<(i|em)>(.*?)</\1>', re.IGNORECASE | re.DOTALL)
H_TAG = re.compile(r'<h([1-6])[^>]*>(.*?)</h\1>', re.IGNORECASE | re.DOTALL)
BR_TAG = re.compile(r'<br\s*/?>', re.IGNORECASE)
DIV_TAG = re.compile(r'<div[^>]*>(.*?)</div>', re.IGNORECASE | re.DOTALL)
UL_TAG = re.compile(r'<ul[^>]*>(.*?)</ul>', re.IGNORECASE | re.DOTALL)
OL_TAG = re.compile(r'<ol[^>]*>(.*?)</ol>', re.IGNORECASE | re.DOTALL)
SPAN_TAG = re.compile(r'<span[^>]*>(.*?)</span>', re.IGNORECASE | re.DOTALL)
FIGURE_TAG = re.compile(r'<figure[^>]*>(.*?)</figure>', re.IGNORECASE | re.DOTALL)
BLOCKQUOTE_TAG = re.compile(r'<blockquote[^>]*>(.*?)</blockquote>', re.IGNORECASE | re.DOTALL)
CODE_TAG = re.compile(r'<code[^>]*>(.*?)</code>', re.IGNORECASE | re.DOTALL)
PRE_TAG = re.compile(r'<pre[^>]*>(.*?)</pre>', re.IGNORECASE | re.DOTALL)
A_TAG = re.compile(r'<a[^>]*href=["\\\']([^"\\\']+)["\\\'][^>]*>(.*?)</a>', re.IGNORECASE | re.DOTALL)

# Для таблиц
TABLE_BLOCK = re.compile(r'<table[^>]*>(.*?)</table>', re.IGNORECASE | re.DOTALL)
TR_BLOCK = re.compile(r'<tr[^>]*>(.*?)</tr>', re.IGNORECASE | re.DOTALL)
TH_BLOCK = re.compile(r'<th[^>]*>(.*?)</th>', re.IGNORECASE | re.DOTALL)
TD_BLOCK = re.compile(r'<td[^>]*>(.*?)</td>', re.IGNORECASE | re.DOTALL)

# Удаляем только одиночные теги без содержимого
SINGLE_TAGS = re.compile(r'<(?:p|div|span|br|hr)[^>]*/?>', re.IGNORECASE)


def clean_html_content(text):
    """Очищает HTML-контент от лишних пробелов и символов"""
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'^\s+|\s+$', '', text, flags=re.MULTILINE)
    text = re.sub(r'\n\s*\n', '\n', text)
    return text.strip()


def html_table_to_md(table_html):
    """Преобразует HTML-таблицу в Markdown-таблицу"""
    rows = []
    for tr in TR_BLOCK.findall(table_html):
        # Сначала ищем th, если нет - td
        headers = TH_BLOCK.findall(tr)
        if headers:
            row = [clean_html_content(cell) for cell in headers]
            rows.append(('header', row))
        else:
            cells = TD_BLOCK.findall(tr)
            if cells:
                row = [clean_html_content(cell) for cell in cells]
                rows.append(('row', row))
    
    if not rows:
        return ''
    
    # Формируем Markdown-таблицу
    md = []
    header_row = None
    
    for kind, row in rows:
        if kind == 'header' and not header_row:
            header_row = row
            md.append('| ' + ' | '.join(header_row) + ' |')
            md.append('|' + '|'.join([' --- ' for _ in header_row]) + '|')
        elif kind == 'row':
            if header_row:
                # Если есть заголовок, выравниваем по количеству столбцов
                while len(row) < len(header_row):
                    row.append(' ')
                md.append('| ' + ' | '.join(row) + ' |')
            else:
                md.append('| ' + ' | '.join(row) + ' |')
    
    return '\n'.join(md) + '\n'


def html_to_md(text):
    """Преобразует HTML в Markdown"""
    
    # Картинки
    text = IMG_TAG.sub(lambda m: f'![]({m.group(1).strip()})', text)
    
    # Ссылки
    text = A_TAG.sub(lambda m: f'[{clean_html_content(m.group(2))}]({m.group(1).strip()})', text)
    
    # Таблицы
    def table_replacer(match):
        return '\n' + html_table_to_md(match.group(1)) + '\n'
    text = TABLE_BLOCK.sub(table_replacer, text)
    
    # Блоки кода
    text = PRE_TAG.sub(lambda m: f'\n```\n{clean_html_content(m.group(1))}\n```\n', text)
    text = CODE_TAG.sub(lambda m: f'`{clean_html_content(m.group(1))}`', text)
    
    # Цитаты
    text = BLOCKQUOTE_TAG.sub(lambda m: f'\n> {clean_html_content(m.group(1))}\n', text)
    
    # Заголовки
    text = H_TAG.sub(lambda m: f"\n{'#' * int(m.group(1))} {clean_html_content(m.group(2))}\n", text)
    
    # Списки
    def ul_replacer(match):
        content = match.group(1)
        items = LI_TAG.findall(content)
        if items:
            return '\n' + '\n'.join([f'- {clean_html_content(item)}' for item in items]) + '\n'
        return ''
    
    def ol_replacer(match):
        content = match.group(1)
        items = LI_TAG.findall(content)
        if items:
            return '\n' + '\n'.join([f'{i+1}. {clean_html_content(item)}' for i, item in enumerate(items)]) + '\n'
        return ''
    
    text = UL_TAG.sub(ul_replacer, text)
    text = OL_TAG.sub(ol_replacer, text)
    
    # Абзацы
    text = P_TAG.sub(lambda m: f'\n{clean_html_content(m.group(1))}\n', text)
    
    # Div блоки
    text = DIV_TAG.sub(lambda m: f'\n{clean_html_content(m.group(1))}\n', text)
    
    # Span элементы
    text = SPAN_TAG.sub(lambda m: clean_html_content(m.group(1)), text)
    
    # Figure элементы
    text = FIGURE_TAG.sub(lambda m: f'\n{clean_html_content(m.group(1))}\n', text)
    
    # Жирный текст
    text = B_TAG.sub(lambda m: f'**{clean_html_content(m.group(2))}**', text)
    
    # Курсив
    text = I_TAG.sub(lambda m: f'*{clean_html_content(m.group(2))}*', text)
    
    # Переносы строк
    text = BR_TAG.sub('  \n', text)
    
    # Удаляем одиночные теги без содержимого
    text = SINGLE_TAGS.sub('', text)
    
    # Убираем лишние пробелы и переносы строк
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r' +', ' ', text)
    text = re.sub(r'\n\s*\n', '\n\n', text)
    
    return text.strip()


def process_file(path):
    """Обрабатывает один файл"""
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Не трогаем frontmatter (--- ... ---)
    if content.startswith('---'):
        fm_end = content.find('---', 3)
        if fm_end != -1:
            fm_end += 3
            frontmatter = content[:fm_end]
            body = content[fm_end:]
            new_body = html_to_md(body)
            new_content = frontmatter + '\n' + new_body
        else:
            new_content = html_to_md(content)
    else:
        new_content = html_to_md(content)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f'Обработан: {path}')


def main():
    """Основная функция"""
    for target_dir in TARGET_DIRS:
        for root, _, files in os.walk(target_dir):
            for file in files:
                if file.endswith('.mdx'):
                    process_file(os.path.join(root, file))


if __name__ == '__main__':
    main() 