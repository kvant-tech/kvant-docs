#!/usr/bin/env python3
import os
import re
import glob

def check_and_fix_image_paths():
    """
    Проверяет пути к изображениям в MDX файлах и заменяет внешние URL на локальные пути,
    если изображение существует локально
    """
    
    # Путь к локальным изображениям
    local_images_dir = "public/help_images_ru"
    
    # Получаем список всех локальных изображений
    local_images = set()
    if os.path.exists(local_images_dir):
        for ext in ['*.png', '*.jpg', '*.jpeg', '*.gif', '*.svg']:
            for img_path in glob.glob(os.path.join(local_images_dir, ext)):
                filename = os.path.basename(img_path)
                local_images.add(filename)
    
    print(f"Найдено {len(local_images)} локальных изображений")
    
    # Паттерн для поиска изображений в MDX файлах
    # Ищем как ![alt](url) так и <img src="url" />
    img_patterns = [
        r'!\[([^\]]*)\]\(([^)]+)\)',  # Markdown изображения
        r'<img[^>]+src=["\']([^"\']+)["\'][^>]*>',  # HTML img теги
    ]
    
    # Обрабатываем все MDX файлы в папке communications
    mdx_files = glob.glob("content/ru/reference/communications/*.mdx")
    
    total_fixed = 0
    
    for mdx_file in mdx_files:
        print(f"\nОбрабатываю: {mdx_file}")
        
        with open(mdx_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        fixed_count = 0
        
        # Обрабатываем Markdown изображения
        def replace_md_image(match):
            alt_text = match.group(1)
            url = match.group(2)
            
            # Если URL содержит platform.rsuquant.ru и имя файла есть локально
            if 'platform.rsuquant.ru' in url:
                filename = os.path.basename(url)
                if filename in local_images:
                    new_url = f"/help_images_ru/{filename}"
                    print(f"  Заменяю: {url} -> {new_url}")
                    return f'![{alt_text}]({new_url})'
            
            return match.group(0)
        
        content = re.sub(img_patterns[0], replace_md_image, content)
        
        # Обрабатываем HTML img теги
        def replace_html_image(match):
            url = match.group(1)
            
            # Если URL содержит platform.rsuquant.ru и имя файла есть локально
            if 'platform.rsuquant.ru' in url:
                filename = os.path.basename(url)
                if filename in local_images:
                    new_url = f"/help_images_ru/{filename}"
                    print(f"  Заменяю: {url} -> {new_url}")
                    # Заменяем только src атрибут
                    return match.group(0).replace(f'src="{url}"', f'src="{new_url}"')
            
            return match.group(0)
        
        content = re.sub(img_patterns[1], replace_html_image, content)
        
        # Если контент изменился, сохраняем файл
        if content != original_content:
            with open(mdx_file, 'w', encoding='utf-8') as f:
                f.write(content)
            fixed_count = len(re.findall(r'platform\.rsuquant\.ru', original_content)) - len(re.findall(r'platform\.rsuquant\.ru', content))
            total_fixed += fixed_count
            print(f"  Исправлено {fixed_count} путей к изображениям")
        else:
            print("  Изменений не требуется")
    
    print(f"\nВсего исправлено путей к изображениям: {total_fixed}")

if __name__ == "__main__":
    check_and_fix_image_paths() 