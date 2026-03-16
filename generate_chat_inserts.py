import json
import sqlite3
import sys
from pathlib import Path
from typing import Iterable, List, Sequence


def escape_sql_string(value: str) -> str:
    return value.replace("'", "''")


def generate_from_json(data_path: Path) -> List[str]:
    raw = json.loads(data_path.read_text(encoding="utf-8"))
    msgs = [obj for obj in raw if obj.get("model") == "chat.message"]

    header = (
        "INSERT INTO chat_message "
        "(id, contact_id, content, created_at, systemmessage, image) VALUES"
    )

    values: List[str] = []
    for msg in msgs:
        fields = msg["fields"]
        content = escape_sql_string(str(fields["content"]))
        created_at = fields["createdat"]
        contact_id = fields["contact"]
        systemmessage = fields["systemmessage"]
        image = escape_sql_string(fields.get("image", ""))

        values.append(
            f"  ({msg['pk']}, {contact_id}, '{content}', "
            f"'{created_at}', {systemmessage}, '{image}')"
        )

    return [header, ",\n".join(values) + ";"]


BOOLEAN_COLUMNS = {
    "chat_message": {"system_message"},
    "chat_customuser": {"is_superuser", "is_staff", "is_active"},
}


def generate_table_sql(
    con: sqlite3.Connection,
    table: str,
) -> List[str]:
    cur = con.cursor()
    cur.execute(f"PRAGMA table_info({table})")
    cols_info = cur.fetchall()
    if not cols_info:
        return []

    col_names: List[str] = [row[1] for row in cols_info]

    cur.execute(f"SELECT * FROM {table}")
    rows: Iterable[Sequence[object]] = cur.fetchall()

    if not rows:
        return []

    header = (
        f"INSERT INTO {table} ("
        + ", ".join(col_names)
        + ") VALUES"
    )

    def format_value(v: object, col: str) -> str:
        if v is None:
            return "NULL"
        if col in BOOLEAN_COLUMNS.get(table, set()):
            return "true" if bool(v) else "false"
        if isinstance(v, (int, float)):
            return str(v)
        return f"'{escape_sql_string(str(v))}'"

    values: List[str] = []
    for row in rows:
        formatted = ", ".join(
            format_value(v, col_names[i]) for i, v in enumerate(row)
        )
        values.append(f"  ({formatted})")

    return [header, ",\n".join(values) + ";"]


def generate_from_sqlite(db_path: Path) -> List[str]:
    con = sqlite3.connect(db_path)
    try:
        tables_in_order = [
            "chat_customuser",
            "chat_contact",
            "chat_chat",
            "chat_chat_admins",
            "chat_chat_participants",
            "chat_message",
            "chat_chat_messages",
        ]

        chunks: List[str] = []
        for table in tables_in_order:
            lines = generate_table_sql(con, table)
            if lines:
                chunks.append("\n".join(lines))

        sequence_fixups = [
            "SELECT setval('chat_customuser_id_seq', (SELECT COALESCE(MAX(id), 1) FROM chat_customuser));",
            "SELECT setval('chat_contact_id_seq', (SELECT COALESCE(MAX(id), 1) FROM chat_contact));",
            "SELECT setval('chat_chat_id_seq', (SELECT COALESCE(MAX(id), 1) FROM chat_chat));",
            "SELECT setval('chat_chat_admins_id_seq', (SELECT COALESCE(MAX(id), 1) FROM chat_chat_admins));",
            "SELECT setval('chat_chat_participants_id_seq', (SELECT COALESCE(MAX(id), 1) FROM chat_chat_participants));",
            "SELECT setval('chat_message_id_seq', (SELECT COALESCE(MAX(id), 1) FROM chat_message));",
            "SELECT setval('chat_chat_messages_id_seq', (SELECT COALESCE(MAX(id), 1) FROM chat_chat_messages));",
        ]
        chunks.append("\n".join(sequence_fixups))
    finally:
        con.close()

    return ["BEGIN;"] + chunks + ["COMMIT;"]


def main() -> None:
    output_path = Path("insert.sql")

    arg_path: Path | None = None
    if len(sys.argv) > 1:
        arg_path = Path(sys.argv[1])

    if arg_path and arg_path.is_file():
        if arg_path.suffix.lower() == ".json":
            lines = generate_from_json(arg_path)
        else:
            lines = generate_from_sqlite(arg_path)
    else:
        sqlite_default = Path("src/db.sqlite3")
        json_default = Path("data.json")
        if sqlite_default.is_file():
            lines = generate_from_sqlite(sqlite_default)
        elif json_default.is_file():
            lines = generate_from_json(json_default)
        else:
            raise SystemExit(
                "No data source found. Provide a path to a JSON fixture or "
                "ensure src/db.sqlite3 or data.json exists."
            )

    output_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()

