const fs = require('fs');
const rows = JSON.parse(fs.readFileSync('data/office_hours.json', 'utf8'));
const escape = (str) => String(str).replace(/'/g, "''");
const values = rows.map(r => `('${escape(r.faculty || '')}', '${escape(r.department || '')}', '${escape(r.email || '')}', '${escape(r.office || '')}', '${escape(r.day || '')}', '${escape(r.start || '')}', '${escape(r.end || '')}', '${escape(r.type || 'In-Person')}')`);
const sql = 'TRUNCATE TABLE office_hours_entries;\nINSERT INTO office_hours_entries (faculty, department, email, office, day, start, "end", type) VALUES\n' + values.join(',\n') + ';';
fs.writeFileSync('sql/insert_data.sql', sql, 'utf8');
console.log('Generated sql/insert_data.sql with ' + rows.length + ' rows.');
