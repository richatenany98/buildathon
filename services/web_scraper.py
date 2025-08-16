import logging
import requests
from typing import Optional
from urllib.parse import urlparse
import trafilatura
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry

class WebScraperService:
    """Service for web scraping and content extraction"""
    
    def __init__(self, timeout: int = 30, max_retries: int = 3):
        self.timeout = timeout
        self.session = requests.Session()
        
        # Configure retry strategy
        retry_strategy = Retry(
            total=max_retries,
            status_forcelist=[429, 500, 502, 503, 504],
            method_whitelist=["HEAD", "GET", "OPTIONS"],
            backoff_factor=1
        )
        
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
        
        # Set headers to appear as a regular browser
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
    
    def is_valid_url(self, url: str) -> bool:
        """Validate URL format and protocol"""
        try:
            parsed = urlparse(url)
            return parsed.scheme in ['http', 'https'] and parsed.netloc
        except Exception:
            return False
    
    def get_website_text_content(self, url: str) -> Optional[str]:
        """
        Extract main text content from a website URL using trafilatura.
        Returns clean, readable text content or None if extraction fails.
        """
        if not self.is_valid_url(url):
            logging.error(f"Invalid URL format: {url}")
            return None
        
        try:
            logging.info(f"Fetching content from URL: {url}")
            
            # Download the webpage
            downloaded = trafilatura.fetch_url(url, config=self._get_trafilatura_config())
            
            if not downloaded:
                logging.error(f"Failed to download content from URL: {url}")
                return None
            
            # Extract text content
            text = trafilatura.extract(
                downloaded,
                include_comments=False,
                include_tables=True,
                include_formatting=False,
                output_format='txt',
                target_language='en'
            )
            
            if not text:
                logging.warning(f"No text content extracted from URL: {url}")
                return None
            
            # Clean up the text
            cleaned_text = self._clean_text(text)
            
            logging.info(f"Successfully extracted {len(cleaned_text)} characters from {url}")
            return cleaned_text
            
        except requests.RequestException as e:
            logging.error(f"Network error fetching {url}: {e}")
            return None
        except Exception as e:
            logging.error(f"Error extracting content from {url}: {e}")
            return None
    
    def _get_trafilatura_config(self):
        """Get trafilatura configuration for content extraction"""
        try:
            import trafilatura.settings
            config = trafilatura.settings.use_config()
            
            # Customize extraction settings
            config.set("DEFAULT", "EXTRACTION_TIMEOUT", "30")
            config.set("DEFAULT", "MIN_EXTRACTED_SIZE", "100")
            config.set("DEFAULT", "MIN_OUTPUT_SIZE", "50")
            
            return config
        except Exception:
            return None
    
    def _clean_text(self, text: str) -> str:
        """Clean and normalize extracted text"""
        if not text:
            return ""
        
        # Remove excessive whitespace
        import re
        
        # Replace multiple newlines with double newline
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        # Replace multiple spaces with single space
        text = re.sub(r' {2,}', ' ', text)
        
        # Remove leading/trailing whitespace from each line
        lines = [line.strip() for line in text.split('\n')]
        text = '\n'.join(lines)
        
        # Remove empty lines at start and end
        text = text.strip()
        
        return text
    
    def get_content_size(self, url: str) -> Optional[int]:
        """Get content size without downloading full content"""
        if not self.is_valid_url(url):
            return None
        
        try:
            response = self.session.head(url, timeout=self.timeout, allow_redirects=True)
            content_length = response.headers.get('content-length')
            
            if content_length:
                return int(content_length)
            else:
                # If HEAD doesn't provide content-length, try partial GET
                response = self.session.get(
                    url, 
                    timeout=self.timeout, 
                    stream=True,
                    headers={'Range': 'bytes=0-1023'}  # Get first 1KB
                )
                
                # Estimate size based on partial content
                if response.status_code in [200, 206]:
                    return len(response.content) * 10  # Rough estimate
                
        except Exception as e:
            logging.error(f"Error getting content size for {url}: {e}")
        
        return None
    
    def validate_and_estimate_size(self, urls: list) -> tuple:
        """
        Validate URLs and estimate total size.
        Returns (valid_urls, estimated_total_bytes, invalid_urls)
        """
        valid_urls = []
        invalid_urls = []
        total_estimated_bytes = 0
        
        for url in urls:
            if not self.is_valid_url(url):
                invalid_urls.append({"url": url, "error": "Invalid URL format"})
                continue
            
            try:
                size = self.get_content_size(url)
                if size is None:
                    # Assume average webpage size if we can't determine
                    size = 50000  # 50KB average
                    
                valid_urls.append({
                    "url": url,
                    "estimated_size": size
                })
                total_estimated_bytes += size
                
            except Exception as e:
                invalid_urls.append({
                    "url": url, 
                    "error": f"Error estimating size: {str(e)}"
                })
        
        return valid_urls, total_estimated_bytes, invalid_urls
    
    def close(self):
        """Close the session"""
        if hasattr(self, 'session'):
            self.session.close()
