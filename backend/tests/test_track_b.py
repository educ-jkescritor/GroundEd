"""Track B: document-backed removed/deprecated features. Each case: text as a module might write it ->
expected finding id, or None = must NOT produce a claim. Offline."""
from datetime import date

import pymupdf
import pytest

from app.pipeline import analyze

TODAY = date(2026, 11, 14)

CASES = [
    # PHP removed in 8.0 / 7.2, deprecated in 8.2
    ('<?php while (list($k, $v) = each($arr)) { echo $v; } ?>', "php-each"),
    ('<?php $f = create_function(\'$a\', \'return $a * 2;\'); ?>', "php-create-function"),
    ('<?php echo money_format("%i", $price); ?>', "php-functions-removed-8"),
    ('<?php if (get_magic_quotes_gpc()) { $name = stripslashes($name); } ?>', "php-functions-removed-8"),
    ('<?php $c = mcrypt_encrypt(MCRYPT_RIJNDAEL_128, $key, $data, MCRYPT_MODE_CBC); ?>', "php-ext-mcrypt"),
    ('<?php $s = utf8_encode($latin); ?>', "php-utf8-encode"),
    # deprecated HTML
    ("<center>Welcome to my page</center>", "html-center"),
    ('<font color="red" size="3">Warning</font>', "html-font"),
    ("<marquee>Breaking news</marquee>", "html-marquee"),
    ('<frameset cols="25%,75%"><frame src="menu.html"></frameset>', "html-frameset"),
    ("<big>Large</big> and <tt>typewriter</tt>", "html-big"),
    ("<tt>code sample</tt>", "html-tt"),
    ('<acronym title="World Wide Web">WWW</acronym>', "html-acronym"),
    ("<strike>old price</strike>", "html-strike"),
    # Flash (end date stated by Adobe)
    ("Embed the animation with Adobe Flash Player and ActionScript 3", "adobe-flash"),
    ("Upload the movie.swf file to the server", "adobe-flash"),
    # must NOT be claims: modern equivalents and look-alikes
    ('$.each(items, function (i, v) { console.log(v); });', None),           # jQuery each
    ("for each ($item in $list) the loop runs once per element", None),     # prose / other languages
    ('<?php foreach ($arr as $k => $v) { echo $v; } ?>', None),              # modern PHP
    ('<?php $f = fn($a) => $a * 2; ?>', None),                               # arrow function
    ('<?php $s = mb_convert_encoding($latin, "UTF-8", "ISO-8859-1"); ?>', None),
    ('<?php $c = openssl_encrypt($data, "aes-256-cbc", $key); ?>', None),
    ("p { text-align: center; font-family: Arial; }", None),                # CSS, not tags
    ('<link href="https://fonts.googleapis.com" rel="stylesheet">', None),
    ("Center the heading and use a bigger font", None),                     # prose
    ("Save the file to a flash drive before the lab", None),               # 'flash' as a word
    ('Show a flash message after login: session()->flash("status", "Saved");', None),
    ("<abbr title=\"World Wide Web\">WWW</abbr> <s>old</s> <code>x</code>", None),  # modern replacements
]


def _pdf(tmp_path, text):
    p = tmp_path / "m.pdf"
    doc = pymupdf.open()
    doc.new_page().insert_textbox(pymupdf.Rect(50, 50, 550, 800), text + "\n" + "filler text here " * 5, fontsize=10)
    doc.save(p)
    return p


@pytest.mark.parametrize("text, expected", CASES)
def test_track_b_cases(tmp_path, text, expected):
    a = analyze(_pdf(tmp_path, text), "m.pdf", today=TODAY, use_cache=False)
    claims = {f.id for f in a.findings if f.status != "supported"}
    if expected is None:
        assert claims == set(), f"false alarm for {text!r}: {claims}"
        return
    assert expected in claims, f"missed {expected} in {text!r}: {claims}"
    f = next(x for x in a.findings if x.id == expected)
    assert f.score and f.lifecycle.source_quote and f.citations
    assert any(p.role == "fact" and p.contains_fact_quote for p in f.passages or []), "fact passage must be retrieved"


def test_dates_come_from_sources(tmp_path):
    a = analyze(_pdf(tmp_path, '<?php each($a); create_function("", ""); mcrypt_create_iv(16); ?> '
                               "Adobe Flash Player"), "m.pdf", today=TODAY, use_cache=False)
    by = {f.id: f for f in a.findings}
    assert by["php-each"].lifecycle.eol_date == "2020-11-26"         # PHP 8.0 release (endoflife.date snapshot)
    assert by["php-ext-mcrypt"].lifecycle.eol_date == "2017-11-30"   # PHP 7.2 release
    assert by["adobe-flash"].lifecycle.eol_date == "2020-12-31"      # stated in Adobe's own sentence


def test_vendor_date_must_be_written_in_the_quote(monkeypatch, tmp_path):
    from app import registry as reg_mod
    bad = reg_mod.load().model_copy(deep=True)
    next(e for e in bad.entries if e.id == "adobe-flash").fact.ended_on = "2019-06-30"  # not in the quote
    monkeypatch.setattr(reg_mod, "get", lambda: bad)
    a = analyze(_pdf(tmp_path, "Adobe Flash Player"), "m.pdf", today=TODAY, use_cache=False)
    f = next(x for x in a.findings if x.id == "adobe-flash")
    assert f.status == "unverified" and f.score is None


ROUND_2 = [
    # PHP 5.4 removals (PHP 5 legacy manual)
    ('<?php // php.ini: register_globals = On\necho $username; ?>', "php-register-globals"),
    ('<?php $name = $HTTP_POST_VARS["name"]; ?>', "php-register-globals"),
    ('<?php if (ini_get("magic_quotes_gpc")) { $s = stripslashes($s); } ?>', "php-magic-quotes"),
    ('<?php session_start(); session_register("user"); ?>', "php-session-register"),
    # HTML
    ('<frame src="menu.html" name="menu">', "html-frame"),
    ('<body bgcolor="#ffffcc" text="black">', "html-body-bgcolor"),
    # JavaScript (MDN)
    ('<script>var q = escape(input.value); location.href = "?q=" + q;</script>', "js-escape"),
    ('<script>const first = name.substr(0, 3); console.log(first);</script>', "js-substr"),
    ('<script>document.addEventListener("keydown", function (e) { if (e.keyCode === 13) send(); });</script>',
     "js-keycode"),
    # must NOT be claims
    ('<?php $name = $_POST["name"]; session_start(); $_SESSION["user"] = $name; ?>', None),     # modern PHP
    ('<?php $first = substr($name, 0, 3); ?>', None),                                       # PHP substr is fine
    ('<?php $safe = mysql_real_escape_string($s); ?>', "php-ext-mysql"),                   # only the mysql_ finding
    ('<script>const q = encodeURIComponent(input.value);</script>', None),
    ('<script>if (e.key === "Enter") send();</script>', None),
    ('body { background-color: #ffffcc; }', None),
    ('<frameset cols="50%,50%"></frameset>', "html-frameset"),                              # not also html-frame
    ("Remember to escape (quote) user input before showing it.", None),                   # prose
]


@pytest.mark.parametrize("text, expected", ROUND_2)
def test_track_b_round_2(tmp_path, text, expected):
    a = analyze(_pdf(tmp_path, text), "m.pdf", today=TODAY, use_cache=False)
    claims = {f.id for f in a.findings if f.status != "supported"}
    if expected is None:
        assert claims == set(), f"false alarm for {text!r}: {claims}"
    else:
        assert claims == {expected}, f"expected only {expected} in {text!r}: {claims}"


def test_php54_removal_dates_come_from_the_release_snapshot(tmp_path):
    a = analyze(_pdf(tmp_path, '<?php session_register("u"); ?>'), "m.pdf", today=TODAY, use_cache=False)
    assert next(f for f in a.findings if f.id == "php-session-register").lifecycle.eol_date == "2012-03-01"
