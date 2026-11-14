# Flagged items (not in the registry)

Items we believe may be outdated but could **not** back with an official source yet. They produce no finding
until someone adds a sourced entry. Format: item · where seen · status · reason.

| Item | Seen in | Status | Reason |
|---|---|---|---|
| `mktime()` `$is_dst` parameter | m04 | needs_manual | No php.net passage found confirming removal (checked function.mktime and migration70.incompatible, 2026-11-14) |
| `https://www.php.net/manual/en/intro.mysql.php` | — | failed | 404: ext/mysql pages were removed from the manual; using migration70.incompatible instead |
| `https://www.php.net/manual/en/intro.pcre.php` | — | failed | 404 (2026-11-14); using book.pcre.php instead |
| Rockmelt browser | m01 | needs_manual | Discontinued, but no official/tier 1–2 source found |
| Mac OS X names (Lion, Snow Leopard, …) | m01 | skipped | Names are ambiguous as plain words; needs version-aware matching |
| PHP version mentions in history slides (PHP 4, PHP 5, PHP 6) | m01, m04 | skipped | Historical mentions, not taught tools — would be false alarms |

## Resolved

- 2026-11-14: removal dates for `mysql_*`, ASP tags and `ereg()` were typed by hand (2015-12-03). They now come from
  the PHP 7.0 release date in `library/snapshot/eol/php.json`, and every quote is checked against the saved document.
