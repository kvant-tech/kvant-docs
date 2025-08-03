import requests
from bs4 import BeautifulSoup
import os
import re
from urllib.parse import urljoin, urlparse
import time

def download_article_and_images():
    url = "https://info.rsuquant.ru/article/23670"
    
    # Headers to mimic a browser request
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        # Download the page
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        # Save the raw HTML for examination
        with open('raw_page.html', 'w', encoding='utf-8') as f:
            f.write(response.text)
        print("Saved raw HTML to raw_page.html")
        
        # Parse the HTML
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Try different selectors to find the main content
        selectors = [
            'div.article-content',
            'article',
            'main',
            '.content',
            '.article',
            'div[class*="content"]',
            'div[class*="article"]',
            'div[class*="text"]',
            'div[class*="body"]'
        ]
        
        main_content = None
        for selector in selectors:
            main_content = soup.select_one(selector)
            if main_content:
                print(f"Found content with selector: {selector}")
                break
        
        if not main_content:
            # If no specific content area found, try to get the body
            main_content = soup.find('body')
            print("Using body as fallback")
        
        if not main_content:
            print("Could not find main content area")
            return None, []
        
        # Extract text content
        content_text = main_content.get_text(separator='\n', strip=True)
        
        # Find all images
        images = main_content.find_all('img')
        image_urls = []
        
        for img in images:
            src = img.get('src')
            if src:
                full_url = urljoin(url, src)
                image_urls.append(full_url)
                print(f"Found image: {full_url}")
        
        return content_text, image_urls
        
    except Exception as e:
        print(f"Error downloading article: {e}")
        return None, []

def download_image(url, filename, save_dir):
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        filepath = os.path.join(save_dir, filename)
        with open(filepath, 'wb') as f:
            f.write(response.content)
        
        print(f"Downloaded: {filename}")
        return True
        
    except Exception as e:
        print(f"Error downloading {filename}: {e}")
        return False

if __name__ == "__main__":
    # Create save directory
    save_dir = "/Users/anna/Kvant/kvant-docs/public/from-carrot-images"
    os.makedirs(save_dir, exist_ok=True)
    
    # Download article and get image URLs
    content, image_urls = download_article_and_images()
    
    if content:
        print("Article content:")
        print("=" * 50)
        print(content)
        print("=" * 50)
    
    # Download images
    print(f"\nFound {len(image_urls)} images")
    for i, url in enumerate(image_urls, 1):
        # Extract file extension
        parsed_url = urlparse(url)
        path = parsed_url.path
        ext = os.path.splitext(path)[1] or '.png'
        
        filename = f"bp_carrot{i}{ext}"
        download_image(url, filename, save_dir)
        time.sleep(1)  # Be nice to the server 