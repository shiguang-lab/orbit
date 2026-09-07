import bcrypt from "bcryptjs";

export async function resetManagementPasswordInDatabase(db, password) {
  const hashedPassword = await bcrypt.hash(password, 12);
  db.prepare(
    `CREATE TABLE IF NOT EXISTS key_value (
      namespace TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      PRIMARY KEY (namespace, key)
    )`
  ).run();
  const insert = db.prepare(
    "INSERT OR REPLACE INTO key_value (namespace, key, value) VALUES ('settings', ?, ?)"
  );
  db.transaction(() => {
    insert.run("password", JSON.stringify(hashedPassword));
    insert.run("requireLogin", "true");
    insert.run("setupComplete", "true");
  })();
}
