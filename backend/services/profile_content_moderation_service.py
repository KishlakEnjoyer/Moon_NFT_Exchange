import logging
import os
import re
import threading
import unicodedata
from typing import Any, Iterable


DEFAULT_HF_MODELS = (
    "cointegrated/rubert-tiny-toxicity",
    "martin-ha/toxic-comment-model",
)
DEFAULT_HF_THRESHOLD = 0.75
DEFAULT_HF_MAX_LENGTH = 256
logger = logging.getLogger(__name__)

LINK_PATTERNS = [
    re.compile(r"(?i)\b(?:https?://|ftp://|www\.)\S+"),
    re.compile(r"(?i)\b(?:t\.me|telegram\.me|vk\.com|discord\.gg|discord(?:app)?\.com/invite)/\S+"),
    re.compile(r"(?i)\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b"),
    re.compile(
        r"(?i)(?<![A-Z0-9_-])"
        r"(?:[A-Z0-9-]{2,63}\.)+"
        "(?:com|ru|net|org|io|gg|me|app|dev|xyz|site|online|info|biz|su|by|kz|ua|\u0440\u0444)"
        r"(?:\b|[/:?#])"
    ),
]

EN_TRANSLATION = str.maketrans({
    "0": "o",
    "1": "i",
    "3": "e",
    "4": "a",
    "5": "s",
    "7": "t",
    "@": "a",
    "$": "s",
    "\u0430": "a",
    "\u0435": "e",
    "\u043e": "o",
    "\u0440": "p",
    "\u0441": "c",
    "\u0445": "x",
    "\u0443": "y",
    "\u043a": "k",
    "\u043c": "m",
    "\u043d": "h",
    "\u0432": "b",
    "\u0442": "t",
})

RU_TRANSLATION = str.maketrans({
    "0": "\u043e",
    "1": "\u0438",
    "3": "\u0435",
    "4": "\u0430",
    "6": "\u0431",
    "@": "\u0430",
    "$": "\u0441",
    "a": "\u0430",
    "e": "\u0435",
    "o": "\u043e",
    "p": "\u0440",
    "c": "\u0441",
    "x": "\u0445",
    "y": "\u0443",
    "k": "\u043a",
    "m": "\u043c",
    "h": "\u043d",
    "b": "\u0432",
    "t": "\u0442",
})

EN_FORBIDDEN_WORDS_ENV = "PROFILE_CONTENT_EN_FORBIDDEN_WORDS"
EN_FORBIDDEN_PREFIXES_ENV = "PROFILE_CONTENT_EN_FORBIDDEN_PREFIXES"
EN_FORBIDDEN_COMPACT_ENV = "PROFILE_CONTENT_EN_FORBIDDEN_COMPACT"
RU_FORBIDDEN_WORDS_ENV = "PROFILE_CONTENT_RU_FORBIDDEN_WORDS"
RU_FORBIDDEN_PREFIXES_ENV = "PROFILE_CONTENT_RU_FORBIDDEN_PREFIXES"
RU_FORBIDDEN_ROOTS_ENV = "PROFILE_CONTENT_RU_FORBIDDEN_ROOTS"
RU_FORBIDDEN_COMPACT_ENV = "PROFILE_CONTENT_RU_FORBIDDEN_COMPACT"

HF_UNSAFE_LABEL_KEYWORDS = (
    "toxic",
    "toxicity",
    "obscene",
    "threat",
    "insult",
    "hate",
    "identity",
    "dangerous",
    "abusive",
    "profane",
    "offensive",
)

HF_SAFE_LABEL_KEYWORDS = (
    "not_toxic",
    "non_toxic",
    "nontoxic",
    "non-toxic",
    "neutral",
    "normal",
    "clean",
    "safe",
)

_HF_MODEL_CACHE: dict[str, tuple[Any, Any, Any]] = {}
_HF_MODEL_LOCK = threading.Lock()


def _env_flag(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default

    return value.strip().lower() in {"1", "true", "yes", "on"}


def _env_float(name: str, default: float) -> float:
    value = os.getenv(name)
    if value is None:
        return default

    try:
        return float(value)
    except ValueError:
        return default


def _env_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None:
        return default

    try:
        return int(value)
    except ValueError:
        return default


def _split_env_list(value: str | None) -> list[str]:
    if not value:
        return []

    if "\\" in value:
        try:
            value = value.encode("utf-8").decode("unicode_escape")
        except UnicodeDecodeError:
            pass

    return [
        item.strip()
        for item in re.split(r"[,;\n]+", value)
        if item.strip()
    ]


def _normalize_text(text: str) -> str:
    text = unicodedata.normalize("NFKC", text).casefold()
    text = text.replace("\u0451", "\u0435")
    return re.sub(r"\s+", " ", text).strip()


def _compact(text: str) -> str:
    return re.sub("[^0-9a-z\u0430-\u044f]+", "", text)


def _tokens(text: str) -> list[str]:
    return re.findall("[0-9a-z\u0430-\u044f]+", text)


def _env_terms(name: str, translation: dict[int, str] | None = None) -> list[str]:
    terms = []
    for item in _split_env_list(os.getenv(name)):
        normalized = _normalize_text(item)
        if translation is not None:
            normalized = normalized.translate(translation)
        if normalized:
            terms.append(normalized)

    return terms


def _env_compact_terms(name: str, translation: dict[int, str] | None = None) -> list[str]:
    terms = []
    for item in _env_terms(name, translation):
        compact_item = _compact(item)
        if compact_item:
            terms.append(compact_item)

    return terms


def _iter_profile_text(username: str, about_me: str | None) -> Iterable[str]:
    yield username
    if about_me:
        yield about_me


def _has_link(text: str) -> bool:
    normalized = _normalize_text(text)
    return any(pattern.search(normalized) for pattern in LINK_PATTERNS)


def _has_custom_forbidden_term(text: str) -> bool:
    custom_terms = _split_env_list(os.getenv("PROFILE_CONTENT_FORBIDDEN_WORDS"))
    if not custom_terms:
        return False

    normalized_text = _normalize_text(text)
    compact_text = _compact(normalized_text)

    for term in custom_terms:
        normalized_term = _normalize_text(term)
        if normalized_term and normalized_term in normalized_text:
            return True

        compact_term = _compact(normalized_term)
        if compact_term and compact_term in compact_text:
            return True

    return False


def _has_english_forbidden_term(text: str) -> bool:
    normalized = _normalize_text(text).translate(EN_TRANSLATION)
    tokens = _tokens(normalized)
    forbidden_words = set(_env_terms(EN_FORBIDDEN_WORDS_ENV, EN_TRANSLATION))
    forbidden_prefixes = tuple(_env_terms(EN_FORBIDDEN_PREFIXES_ENV, EN_TRANSLATION))
    forbidden_compact = _env_compact_terms(EN_FORBIDDEN_COMPACT_ENV, EN_TRANSLATION)

    if any(token in forbidden_words for token in tokens):
        return True

    if any(token.startswith(prefix) for token in tokens for prefix in forbidden_prefixes):
        return True

    compact_text = _compact(normalized)
    return any(term in compact_text for term in forbidden_compact)


def _has_russian_forbidden_term(text: str) -> bool:
    normalized = _normalize_text(text).translate(RU_TRANSLATION)
    tokens = _tokens(normalized)
    forbidden_words = set(_env_terms(RU_FORBIDDEN_WORDS_ENV, RU_TRANSLATION))
    forbidden_prefixes = tuple(_env_terms(RU_FORBIDDEN_PREFIXES_ENV, RU_TRANSLATION))
    forbidden_roots = _env_compact_terms(RU_FORBIDDEN_ROOTS_ENV, RU_TRANSLATION)
    forbidden_compact = _env_compact_terms(RU_FORBIDDEN_COMPACT_ENV, RU_TRANSLATION)

    if any(token in forbidden_words for token in tokens):
        return True

    if any(token.startswith(prefix) for token in tokens for prefix in forbidden_prefixes):
        return True

    compact_text = _compact(normalized)
    return (
        any(root in compact_text for root in forbidden_roots)
        or any(term in compact_text for term in forbidden_compact)
    )


def _validate_local_profile_content(username: str, about_me: str | None) -> None:
    for text in _iter_profile_text(username, about_me):
        if _has_link(text):
            raise ValueError("Nickname and about me cannot contain links")

        if (
            _has_custom_forbidden_term(text)
            or _has_english_forbidden_term(text)
            or _has_russian_forbidden_term(text)
        ):
            raise ValueError("Nickname or about me contains forbidden words")


def _get_hf_model_names() -> list[str]:
    return _split_env_list(os.getenv("PROFILE_CONTENT_HF_MODELS")) or list(DEFAULT_HF_MODELS)


def _load_hf_model(model_name: str) -> tuple[Any, Any, Any]:
    with _HF_MODEL_LOCK:
        cached = _HF_MODEL_CACHE.get(model_name)
        if cached:
            return cached

        from transformers import AutoModelForSequenceClassification, AutoTokenizer
        import torch

        tokenizer = AutoTokenizer.from_pretrained(model_name)
        model = AutoModelForSequenceClassification.from_pretrained(model_name)
        model.eval()

        if torch.cuda.is_available():
            model.to("cuda")

        cached = (tokenizer, model, torch)
        _HF_MODEL_CACHE[model_name] = cached
        return cached


def _normalize_hf_label(label: str) -> str:
    return label.strip().casefold().replace(" ", "_").replace("-", "_")


def _is_safe_hf_label(label: str) -> bool:
    normalized = _normalize_hf_label(label)
    return any(keyword in normalized for keyword in HF_SAFE_LABEL_KEYWORDS)


def _is_unsafe_hf_label(label: str) -> bool:
    normalized = _normalize_hf_label(label)
    if _is_safe_hf_label(normalized):
        return False

    return any(keyword in normalized for keyword in HF_UNSAFE_LABEL_KEYWORDS)


def _is_multilabel_hf_model(model: Any, labels: list[str]) -> bool:
    problem_type = getattr(model.config, "problem_type", None)
    if problem_type == "multi_label_classification":
        return True

    return len(labels) > 2 and any(_is_unsafe_hf_label(label) for label in labels)


def _score_cointegrated_toxicity(labels: list[str], probabilities: list[float]) -> float | None:
    normalized_labels = [_normalize_hf_label(label) for label in labels]

    if "non_toxic" not in normalized_labels or "dangerous" not in normalized_labels:
        return None

    non_toxic = probabilities[normalized_labels.index("non_toxic")]
    dangerous = probabilities[normalized_labels.index("dangerous")]
    return 1 - non_toxic * (1 - dangerous)


def _score_hf_probabilities(model_name: str, labels: list[str], probabilities: list[float]) -> float:
    if "cointegrated/rubert-tiny-toxicity" in model_name:
        score = _score_cointegrated_toxicity(labels, probabilities)
        if score is not None:
            return score

    unsafe_scores = [
        probability
        for label, probability in zip(labels, probabilities)
        if _is_unsafe_hf_label(label)
    ]
    if unsafe_scores:
        return max(unsafe_scores)

    normalized_labels = [_normalize_hf_label(label) for label in labels]
    if len(probabilities) == 2 and normalized_labels == ["label_0", "label_1"]:
        return probabilities[1]

    if len(probabilities) == 2:
        safe_indexes = [
            index
            for index, label in enumerate(labels)
            if _is_safe_hf_label(label)
        ]
        if safe_indexes:
            return max(
                probability
                for index, probability in enumerate(probabilities)
                if index not in safe_indexes
            )

    return 0.0


def _score_with_hf_model(model_name: str, text: str) -> float:
    tokenizer, model, torch = _load_hf_model(model_name)
    max_length = _env_int("PROFILE_CONTENT_HF_MAX_LENGTH", DEFAULT_HF_MAX_LENGTH)

    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=max_length,
    )
    device = next(model.parameters()).device
    inputs = {
        key: value.to(device)
        for key, value in inputs.items()
    }

    with torch.no_grad():
        logits = model(**inputs).logits[0]

    label_count = int(logits.shape[-1])
    labels = [
        model.config.id2label.get(index, f"LABEL_{index}")
        for index in range(label_count)
    ]

    if _is_multilabel_hf_model(model, labels):
        probabilities = torch.sigmoid(logits).detach().cpu().tolist()
    else:
        probabilities = torch.softmax(logits, dim=-1).detach().cpu().tolist()

    return _score_hf_probabilities(model_name, labels, probabilities)


def _moderate_with_huggingface(username: str, about_me: str | None) -> None:
    if not _env_flag("PROFILE_CONTENT_HF_ENABLED", True):
        return

    require_hf = _env_flag("PROFILE_CONTENT_REQUIRE_HF", False)
    model_names = _get_hf_model_names()
    if not model_names:
        return

    threshold = _env_float("PROFILE_CONTENT_HF_THRESHOLD", DEFAULT_HF_THRESHOLD)
    texts = [text for text in _iter_profile_text(username, about_me) if text.strip()]

    try:
        for text in texts:
            for model_name in model_names:
                if _score_with_hf_model(model_name, text) >= threshold:
                    raise ValueError("Nickname or about me did not pass moderation")
    except ValueError:
        raise
    except Exception as error:
        if require_hf:
            raise ValueError("Profile text moderation is unavailable")
        logger.warning("Profile Hugging Face moderation skipped: %s", error)


def validate_profile_content(username: str, about_me: str | None) -> None:
    _validate_local_profile_content(username, about_me)
    _moderate_with_huggingface(username, about_me)


def warmup_profile_content_moderation() -> None:
    if not _env_flag("PROFILE_CONTENT_HF_ENABLED", True):
        return

    for model_name in _get_hf_model_names():
        _score_with_hf_model(model_name, "warmup")

def preload_profile_content_moderation() -> None:
    if not _env_flag("PROFILE_CONTENT_HF_ENABLED", True):
        return

    model_names = _get_hf_model_names()
    if not model_names:
        return

    logger.info("Preloading profile content moderation models: %s", ", ".join(model_names))

    for model_name in model_names:
        _load_hf_model(model_name)

    logger.info("Profile content moderation models loaded")
