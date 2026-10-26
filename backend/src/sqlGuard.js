const FORBIDDEN =
  /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|execute|call|do|vacuum|lock|comment|set|reset|listen|notify|into|public)\b|pg_|information_schema|current_setting|set_config/i;

function validate(raw) {
  const sql = String(raw || '').trim().replace(/;+\s*$/, '');
  if (!/^(select|with)\b/i.test(sql)) throw new Error('Vetëm SELECT lejohet');
  if (sql.includes(';')) throw new Error('Lejohet vetëm një query');
  if (/--|\/\*/.test(sql)) throw new Error('Komentet nuk lejohen');
  if (FORBIDDEN.test(sql)) throw new Error('Query përmban fjalë të ndaluara');
  return sql;
}

module.exports = { validate };
