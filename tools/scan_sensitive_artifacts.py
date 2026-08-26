#!/usr/bin/env python3
"""Fail when a source tree/archive contains runtime diagnostics or materialized secrets."""

from __future__ import annotations

import io
import re
import sys
import tarfile
import tempfile
import zipfile
from pathlib import Path, PurePosixPath

MAX_FILE_BYTES = 5 * 1024 * 1024
ARCHIVE_SUFFIXES = (".zip", ".scripting", ".tar", ".tar.gz", ".tgz")
SKIP_CONTENT = {"tools/scan_sensitive_artifacts.py"}
ALLOWED_SYNTHETIC = {("src/selfTest.ts", "https://e-hentai.org/?f_search=female%3Atest")}
RULES = {
    "GALLERY_URL": re.compile(r"https?://(?:e-hentai\.org|exhentai\.org)/g/\d{5,}/[0-9a-f]{8,}/?", re.I),
    "IMAGE_PAGE_URL": re.compile(r"https?://(?:e-hentai\.org|exhentai\.org)/s/[0-9a-f]{8,}/\d{5,}-\d+", re.I),
    "SIGNED_IMAGE_URL": re.compile(r"[?&]keystamp=[^&\s\"'<>]+", re.I),
    "SEARCH_QUERY_URL": re.compile(r"https?://(?:e-hentai\.org|exhentai\.org)/[^\"'\s<>]*[?&](?:f_search|search|q)=[^&\"'\s<>]+", re.I),
    "COOKIE_VALUE": re.compile(r"(?:\bCookie\s*[=:]\s*[\"'][^\"']{8,}[\"']|\b(?:ipb_member_id|ipb_pass_hash|igneous)\s*=\s*[\"'][^\"']{8,}[\"']|[\"']name[\"']\s*:\s*[\"'](?:ipb_member_id|ipb_pass_hash|igneous)[\"'][^}\n]{0,300}?[\"']value[\"']\s*:\s*[\"'][^\"']{8,}[\"'])", re.I),
    "PRIVATE_PATH": re.compile(r"(?:file://)?/(?:private/)?var/mobile/(?:Containers|Library)/[^\"'\s<>]+", re.I),
}


def is_runtime_member(name: str) -> bool:
    return "runtime" in PurePosixPath(name).parts


def allowed(rel: str, line: str, rule: str) -> bool:
    return rel in SKIP_CONTENT or (rule == "SEARCH_QUERY_URL" and any(rel == path and value in line for path, value in ALLOWED_SYNTHETIC))


def scan_text(name: str, data: bytes) -> list[tuple[str, int, str]]:
    if len(data) > MAX_FILE_BYTES:
        return [(name, 0, "FILE_TOO_LARGE")]
    try:
        text = data.decode("utf-8")
    except UnicodeError:
        return []
    findings: list[tuple[str, int, str]] = []
    for number, line in enumerate(text.splitlines(), 1):
        for rule, pattern in RULES.items():
            if pattern.search(line) and not allowed(name, line, rule):
                findings.append((name, number, rule))
    return findings


def scan_archive(path: Path, rel: str) -> list[tuple[str, int, str]]:
    findings: list[tuple[str, int, str]] = []
    try:
        if path.name.lower().endswith((".zip", ".scripting")):
            with zipfile.ZipFile(path) as archive:
                members = [(item.filename, archive.read(item)) for item in archive.infolist() if not item.is_dir()]
        else:
            with tarfile.open(path) as archive:
                members = [(item.name, archive.extractfile(item).read()) for item in archive.getmembers() if item.isfile()]
    except (OSError, tarfile.TarError, zipfile.BadZipFile):
        return [(rel, 0, "UNREADABLE_ARCHIVE")]
    for name, data in members:
        member = f"{rel}!{name}"
        source_rel = PurePosixPath(*PurePosixPath(name).parts[1:]).as_posix()
        if is_runtime_member(name):
            findings.append((member, 0, "RUNTIME_ARTIFACT"))
        findings.extend((member, line, rule) for _, line, rule in scan_text(source_rel, data))
    return findings


def scan(root: Path) -> list[tuple[str, int, str]]:
    findings: list[tuple[str, int, str]] = []
    if (root / "runtime").exists():
        findings.append(("runtime", 0, "RUNTIME_ARTIFACT"))
    for path in sorted(item for item in root.rglob("*") if item.is_file()):
        rel = path.relative_to(root).as_posix()
        if rel in SKIP_CONTENT:
            continue
        lower = path.name.lower()
        if lower.endswith(ARCHIVE_SUFFIXES):
            findings.extend(scan_archive(path, rel))
        else:
            try:
                findings.extend(scan_text(rel, path.read_bytes()))
            except OSError:
                findings.append((rel, 0, "UNREADABLE_FILE"))
    return findings


def self_test() -> None:
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        (root / "leak.log").write_text("https://e-hentai.org/g/4135316/b11c4e7728/", encoding="utf-8")
        assert ("leak.log", 1, "GALLERY_URL") in scan(root)
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        (root / "cookie.json").write_text('{"name":"ipb_pass_hash","value":"fixture-secret-value"}', encoding="utf-8")
        assert ("cookie.json", 1, "COOKIE_VALUE") in scan(root)
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        with zipfile.ZipFile(root / "source.zip", "w") as archive:
            archive.writestr("project/runtime/events/event.json", "{}")
        assert any(rule == "RUNTIME_ARTIFACT" for _, _, rule in scan(root))
    print("sensitive-artifact scanner self-test passed")


def main() -> int:
    if len(sys.argv) > 1 and sys.argv[1] == "--self-test":
        self_test()
        return 0
    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    if not root.is_dir():
        print("scan root is not a directory", file=sys.stderr)
        return 2
    findings = scan(root)
    if findings:
        for path, line, rule in findings:
            print(f"{path}:{line} {rule}" if line else f"{path} {rule}")
        print(f"sensitive-artifact scan failed: {len(findings)} finding(s)", file=sys.stderr)
        return 1
    print("sensitive-artifact scan passed: 0 findings")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
