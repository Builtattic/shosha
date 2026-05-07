import fitz  # PyMuPDF
import sys
import os

pdf_path = "ShoSha Documentation.pdf"
output_dir = "C:\\Users\\batha\\.gemini\\antigravity\\brain\\c6998d4c-ddef-4378-b129-f6eb991aca1a\\scratch"
os.makedirs(output_dir, exist_ok=True)

try:
    doc = fitz.open(pdf_path)
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        pix = page.get_pixmap(dpi=150)
        output_file = os.path.join(output_dir, f"page_{page_num + 1}.png")
        pix.save(output_file)
        print(f"Saved {output_file}")
except Exception as e:
    print(f"Error: {e}")
