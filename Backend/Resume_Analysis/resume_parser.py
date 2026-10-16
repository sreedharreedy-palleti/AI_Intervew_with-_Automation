import io
from pathlib import Path
from pypdf import PdfReader
from docx import Document


def extract_resume_text(file_bytes: bytes, file_name: str) -> str:
    """Reads PDF or DOCX file content from memory and extracts readable text."""
    suffix = Path(file_name).suffix.lower()
    text_content = []

    try:
        if suffix == ".pdf":
            reader = PdfReader(io.BytesIO(file_bytes))
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text_content.append(page_text.strip())

        elif suffix in [".docx", ".doc"]:
            document = Document(io.BytesIO(file_bytes))
            for paragraph in document.paragraphs:
                if paragraph.text:
                    text_content.append(paragraph.text.strip())

    except Exception as exc:
        print(f"[RESUME PARSER ERROR] Could not extract text from {file_name}: {exc}")

    return "\n".join(text_content).strip()