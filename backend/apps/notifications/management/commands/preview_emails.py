"""Render every email in both languages without sending any provider traffic."""

from pathlib import Path

from django.core.management.base import BaseCommand
from django.utils.html import format_html, format_html_join

from services.email import render_email
from services.email_copy import COPY


class Command(BaseCommand):
    help = "Write HTML and text previews for every email template (no mail is sent)."

    def add_arguments(self, parser):
        parser.add_argument("--output", default="/tmp/wedemboyz-email-previews")

    def handle(self, *args, **options):
        output = Path(options["output"])
        output.mkdir(parents=True, exist_ok=True)
        links = []
        for event in COPY:
            for language in ("en", "fr"):
                result = render_email(
                    event,
                    language=language,
                    name="Marie N.",
                    details=[("Reference", "WDL-000042"), ("Total", "8 500 XAF")],
                    body="Example preview / Exemple d’aperçu",
                )
                stem = f"{event}-{language}"
                (output / f"{stem}.html").write_text(result["html"])
                (output / f"{stem}.txt").write_text(result["text"])
                links.append((f"{stem}.html", stem))
        items = format_html_join("", '<li><a href="{}">{}</a></li>', links)
        (output / "index.html").write_text(
            str(
                format_html(
                    '<!doctype html><html lang="en"><meta charset="utf-8">'
                    '<title>Email previews</title><h1>Wedemboyz email previews</h1>'
                    '<ul>{}</ul></html>',
                    items,
                )
            )
        )
        self.stdout.write(
            self.style.SUCCESS(f"Rendered {len(links)} previews: {output / 'index.html'}")
        )
