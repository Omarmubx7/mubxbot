const fs = require('fs'); 
const rows = JSON.parse(fs.readFileSync('data/office_hours.json', 'utf8')).filter(r => r.faculty && r.faculty.toLowerCase().includes('balqees')); 
const escape = (str) => String(str).replace(/'/g, "''"); 
const values = rows.map(r => `('${escape(r.faculty || '')}', '${escape(r.department || '')}', '${escape(r.email || '')}', '${escape(r.office || '')}', '${escape(r.day || '')}', '${escape(r.start || '')}', '${escape(r.end || '')}', '${escape(r.type || 'In-Person')}')`); 
console.log('INSERT INTO office_hours_entries (faculty, department, email, office, day, start, "end", type) VALUES\n' + values.join(',\n') + ';');
