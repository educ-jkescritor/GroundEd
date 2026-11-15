"""Generate the public demo sample PDFs in data/samples/ (written by the team; safe to commit).

  uv run python scripts/make_samples.py
"""
from pathlib import Path

import pymupdf

OUT = Path(__file__).resolve().parent.parent / "data" / "samples"

SAMPLES = {
    "legacy-php-lab": [
        "Web Systems Lab Manual (sample)\nModule 3: Building a Student Records App with PHP",
        "Lab Setup\nOperating System: Windows 7 or Windows 8\nBrowser: Internet Explorer or Google Chrome\n"
        "Web server: XAMPP (Apache + MySQL)",
        "Embedding PHP\nYou may write PHP blocks using the asp style tag:\n<% echo \"Hello\"; %>",
        "Creating the table\nmysql> CREATE TABLE tblStudent(id int(5) primary key, name varchar(30));",
        "Connecting to the database\n$conn = mysql_connect(\"localhost\", \"root\", \"\");\nmysql_select_db(\"school\");",
        "Reading records\n$result = mysql_query(\"SELECT * FROM tblStudent\");\n"
        "while ($row = mysql_fetch_array($result)) { echo $row['name']; }",
        "Validating input\nif (ereg(\"^[0-9]+$\", $id)) { echo \"valid id\"; }",
        "Listing the records\n<?php while (list($key, $name) = each($names)) { echo $name; } ?>",
        "Page layout\n<center><font color=\"navy\" size=\"5\">Student Records</font></center>",
    ],
    "modern-php-lab": [
        "Web Systems Lab Manual (sample)\nModule 3: Building a Student Records App with PHP 8",
        "Lab Setup\nOperating System: Windows 11, macOS or Linux\nBrowser: Microsoft Edge, Firefox or Chrome",
        "Connecting to the database\n$pdo = new PDO($dsn, $user, $pass);",
        "Reading records safely\n$stmt = $pdo->prepare(\"SELECT * FROM students WHERE id = ?\");\n$stmt->execute([$id]);",
        "Validating input\nif (preg_match('/^[0-9]+$/', $id)) { echo 'valid id'; }",
    ],
}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, pages in SAMPLES.items():
        doc = pymupdf.open()
        for text in pages:
            page = doc.new_page()
            page.insert_textbox(pymupdf.Rect(60, 60, 540, 780), text, fontsize=13, fontname="helv")
        doc.set_metadata({"title": name, "author": "GroundEd team (public sample)"})
        doc.save(OUT / f"{name}.pdf", deflate=True, garbage=4)
        print("wrote", OUT / f"{name}.pdf")


if __name__ == "__main__":
    main()
