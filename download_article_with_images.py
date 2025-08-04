#!/usr/bin/env python3
import requests
from bs4 import BeautifulSoup
import re
import os
import sys
from urllib.parse import urljoin, urlparse
import time

def download_article_with_images(url):
    try:
        # Get the page
        response = requests.get(url)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Find article title
        title_element = soup.find('h1')
        if title_element:
            article_title = title_element.get_text().strip()
        else:
            article_title = "article"
        
        # Clean title for filename
        clean_title = re.sub(r'[^\w\s-]', '', article_title).strip()
        clean_title = re.sub(r'[-\s]+', '_', clean_title)
        
        print(f"Article title: {article_title}")
        print(f"Clean title: {clean_title}")
        
        # Find content div
        content_div = soup.find('div', class_=re.compile(r'content'))
        if not content_div:
            print("Content div not found")
            return
        
        # Extract text content
        content_text = content_div.get_text(separator='\n', strip=True)
        print("Article content:")
        print("=" * 50)
        print(content_text)
        print("=" * 50)
        
        # Find all images
        images = content_div.find_all('img')
        print(f"\nFound {len(images)} images")
        
        # Download images
        image_counter = 1
        for img in images:
            src = img.get('src')
            if src:
                # Make URL absolute
                if not src.startswith('http'):
                    src = urljoin(url, src)
                
                # Generate filename based on article title
                file_extension = os.path.splitext(urlparse(src).path)[1]
                if not file_extension:
                    file_extension = '.png'
                
                filename = f"{clean_title.lower()}_{image_counter}{file_extension}"
                
                print(f"Downloading: {src}")
                print(f"Filename: {filename}")
                
                try:
                    img_response = requests.get(src)
                    img_response.raise_for_status()
                    
                    # Save to from-carrot-images directory
                    output_path = f"public/from-carrot-images/{filename}"
                    with open(output_path, 'wb') as f:
                        f.write(img_response.content)
                    
                    print(f"Downloaded: {filename}")
                    image_counter += 1
                    
                    # Small delay to be respectful
                    time.sleep(0.5)
                    
                except Exception as e:
                    print(f"Failed to download {src}: {e}")
        
        # Save raw HTML for debugging
        with open('raw_article_page.html', 'w', encoding='utf-8') as f:
            f.write(response.text)
        print("Saved raw HTML to raw_article_page.html")
        
        return content_text, clean_title
        
    except Exception as e:
        print(f"Error: {e}")
        return None, None

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 download_article_with_images.py <url>")
        sys.exit(1)
    
    url = sys.argv[1]
    content, title = download_article_with_images(url)
    
    if content and title:
        print(f"\nArticle '{title}' downloaded successfully!")
        print(f"Images saved to public/from-carrot-images/ with prefix: {title.lower()}_")
    else:
        print("Failed to download article") 