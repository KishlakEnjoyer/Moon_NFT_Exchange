from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from threading import Lock
from urllib.parse import urlparse

from PIL import Image, UnidentifiedImageError


SERVICE_FILE = Path(__file__).resolve()
BACKEND_ROOT = SERVICE_FILE.parents[1]
PROJECT_ROOT = BACKEND_ROOT.parent

IMAGES_DIR = BACKEND_ROOT / "images" if (BACKEND_ROOT / "images").exists() else PROJECT_ROOT / "images"
PRESENTS_DIR = IMAGES_DIR / "presents"

DEFAULT_CLIP_MODEL_ID = "openai/clip-vit-large-patch14"
DEFAULT_TRANSLATOR_MODEL_ID = "Helsinki-NLP/opus-mt-ru-en"
DEFAULT_TOP_K = 50
MAX_TOP_K = 100
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}


@dataclass(frozen=True)
class SmartSearchItem:
    id: int
    image_url: str | None


@dataclass(frozen=True)
class SmartSearchResult:
    id: int
    score: float
    query_for_clip: str


def has_cyrillic(text: str) -> bool:
    return any("\u0400" <= char <= "\u04ff" for char in text)


def normalize_top_k(top_k: int | None, item_count: int) -> int:
    if item_count <= 0:
        return 0

    if top_k is None:
        top_k = DEFAULT_TOP_K

    return max(1, min(top_k, item_count, MAX_TOP_K))


def image_path_from_url(image_url: str | None) -> Path | None:
    if not image_url:
        return None

    parsed_path = urlparse(image_url).path
    filename = Path(parsed_path).name
    if not filename:
        return None

    path = PRESENTS_DIR / filename
    if path.suffix.lower() not in IMAGE_EXTENSIONS:
        path = path.with_suffix(".png")

    return path


def cache_key_for_path(path: Path) -> str:
    return str(path.resolve())


def get_pooler_output(model_output):
    if hasattr(model_output, "pooler_output"):
        return model_output.pooler_output

    return model_output


class SmartSearchService:
    def __init__(
        self,
        clip_model_id: str = DEFAULT_CLIP_MODEL_ID,
        translator_model_id: str = DEFAULT_TRANSLATOR_MODEL_ID,
    ):
        self.clip_model_id = clip_model_id
        self.translator_model_id = translator_model_id

        self._lock = Lock()
        self._device = None
        self._torch = None
        self._functional = None
        self._np = None

        self._clip_model = None
        self._clip_processor = None
        self._translator_model = None
        self._translator_tokenizer = None

        self._image_cache = {}

    def search(
        self,
        query: str,
        items: list[SmartSearchItem],
        top_k: int | None = None,
    ) -> list[SmartSearchResult]:
        query = query.strip()
        if not query or not items:
            return []

        top_k = normalize_top_k(top_k, len(items))
        if top_k == 0:
            return []

        with self._lock:
            self._load_clip()
            query_for_clip = self._prepare_query(query)

            item_paths = []
            for item in items:
                image_path = image_path_from_url(item.image_url)
                if image_path is None or not image_path.exists():
                    continue

                item_paths.append((item.id, image_path))

            embeddings_by_path = self._get_image_embeddings([path for _, path in item_paths])
            rows = [
                (item_id, embeddings_by_path[cache_key_for_path(path)])
                for item_id, path in item_paths
                if cache_key_for_path(path) in embeddings_by_path
            ]

            if not rows:
                return []

            text_embedding = self._encode_text([query_for_clip])[0]
            image_embeddings = self._np.stack([row[1] for row in rows])
            scores = image_embeddings @ text_embedding
            best_indices = self._np.argsort(scores)[::-1][:top_k]

            return [
                SmartSearchResult(
                    id=rows[index][0],
                    score=float(scores[index]),
                    query_for_clip=query_for_clip,
                )
                for index in best_indices
            ]

    def _load_clip(self) -> None:
        if self._clip_model is not None and self._clip_processor is not None:
            return

        import numpy as np
        import torch
        import torch.nn.functional as functional
        from transformers import CLIPModel, CLIPProcessor

        self._np = np
        self._torch = torch
        self._functional = functional
        self._device = "cuda" if torch.cuda.is_available() else "cpu"

        self._clip_model = CLIPModel.from_pretrained(self.clip_model_id).to(self._device)
        self._clip_processor = CLIPProcessor.from_pretrained(self.clip_model_id)
        self._clip_model.eval()

    def _load_translator(self) -> None:
        if self._translator_model is not None and self._translator_tokenizer is not None:
            return

        from transformers import MarianMTModel, MarianTokenizer

        self._translator_tokenizer = MarianTokenizer.from_pretrained(self.translator_model_id)
        self._translator_model = MarianMTModel.from_pretrained(self.translator_model_id).to(self._device)
        self._translator_model.eval()

    def _prepare_query(self, query: str) -> str:
        if not has_cyrillic(query):
            return query

        self._load_translator()
        inputs = self._translator_tokenizer(
            [query],
            return_tensors="pt",
            padding=True,
            truncation=True,
        ).to(self._device)

        with self._torch.no_grad():
            generated = self._translator_model.generate(**inputs)

        translated = self._translator_tokenizer.decode(generated[0], skip_special_tokens=True)
        return translated.strip() or query

    def _get_image_embeddings(self, paths: list[Path]):
        embeddings_by_path = {}
        missing = []
        seen_paths = set()

        for path in paths:
            cache_key = cache_key_for_path(path)
            if cache_key in seen_paths:
                continue

            seen_paths.add(cache_key)

            try:
                stat = path.stat()
            except OSError:
                continue

            cached = self._image_cache.get(cache_key)
            if cached and cached["mtime_ns"] == stat.st_mtime_ns and cached["size"] == stat.st_size:
                embeddings_by_path[cache_key] = cached["embedding"]
                continue

            missing.append((path, cache_key, stat.st_mtime_ns, stat.st_size))

        if missing:
            images = []
            image_meta = []
            for path, cache_key, mtime_ns, size in missing:
                image = self._open_image(path)
                if image is None:
                    continue

                images.append(image)
                image_meta.append((cache_key, mtime_ns, size))

            if images:
                embeddings = self._encode_images(images)
                for (cache_key, mtime_ns, size), embedding in zip(image_meta, embeddings):
                    self._image_cache[cache_key] = {
                        "mtime_ns": mtime_ns,
                        "size": size,
                        "embedding": embedding,
                    }
                    embeddings_by_path[cache_key] = embedding

        return embeddings_by_path

    def _open_image(self, path: Path):
        try:
            with Image.open(path) as image:
                return image.convert("RGB")
        except (FileNotFoundError, UnidentifiedImageError, OSError):
            return None

    def _encode_images(self, images):
        with self._torch.no_grad():
            image_inputs = self._clip_processor(
                images=images,
                return_tensors="pt",
            ).to(self._device)
            image_features = get_pooler_output(self._clip_model.get_image_features(**image_inputs))
            image_features = self._functional.normalize(image_features, p=2, dim=-1)

        return image_features.cpu().numpy()

    def _encode_text(self, texts: list[str]):
        with self._torch.no_grad():
            text_inputs = self._clip_processor(
                text=texts,
                return_tensors="pt",
                padding=True,
                truncation=True,
            ).to(self._device)
            text_features = get_pooler_output(self._clip_model.get_text_features(**text_inputs))
            text_features = self._functional.normalize(text_features, p=2, dim=-1)

        return text_features.cpu().numpy()


smart_search_service = SmartSearchService(
    clip_model_id=os.getenv("SMART_SEARCH_CLIP_MODEL", DEFAULT_CLIP_MODEL_ID),
    translator_model_id=os.getenv("SMART_SEARCH_TRANSLATOR_MODEL", DEFAULT_TRANSLATOR_MODEL_ID),
)
