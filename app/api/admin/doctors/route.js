import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';

const DATA_PATH = path.join(process.cwd(), 'data', 'office_hours.json');
const DAY_ORDER = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

function normalizeName(value = '') {
  return String(value).trim().toLowerCase();
}

async function readRows() {
  const raw = await fs.readFile(DATA_PATH, 'utf8');
  const parsed = JSON.parse(raw || '[]');
  return Array.isArray(parsed) ? parsed : [];
}

async function writeRows(rows) {
  await fs.writeFile(DATA_PATH, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
}

function parseDaySlots(rawValue = '') {
  const value = String(rawValue || '').trim();
  if (!value) return [];

  return value
    .split(',')
    .map(slot => slot.trim())
    .filter(Boolean)
    .map(slot => {
      const [startPart, endPart] = slot.split('-').map(part => String(part || '').trim());
      return {
        start: startPart || '',
        end: endPart || ''
      };
    })
    .filter(slot => slot.start || slot.end);
}

function buildRowsFromDoctor(doctor) {
  const officeHours = doctor?.office_hours || {};
  const rows = [];

  for (const day of DAY_ORDER) {
    const parsedSlots = parseDaySlots(officeHours[day]);
    for (const slot of parsedSlots) {
      rows.push({
        faculty: doctor.name,
        department: doctor.department || '',
        email: doctor.email || '',
        office: doctor.office || '',
        day,
        start: slot.start,
        end: slot.end,
        type: 'In-Person'
      });
    }
  }

  if (rows.length === 0) {
    rows.push({
      faculty: doctor.name,
      department: doctor.department || '',
      email: doctor.email || '',
      office: doctor.office || '',
      day: '',
      start: '',
      end: '',
      type: 'In-Person'
    });
  }

  return rows;
}

function validateDoctorPayload(doctor) {
  if (!doctor || typeof doctor !== 'object') return 'Invalid request body';
  if (!String(doctor.name || '').trim()) return 'Name is required';
  if (!String(doctor.department || '').trim()) return 'Department is required';
  if (!String(doctor.email || '').trim()) return 'Email is required';
  if (!String(doctor.office || '').trim()) return 'Office is required';
  return null;
}

export async function POST(req) {
  try {
    const doctor = await req.json();
    const validationError = validateDoctorPayload(doctor);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const rows = await readRows();
    const nameKey = normalizeName(doctor.name);
    const exists = rows.some(row => normalizeName(row.faculty) === nameKey);
    if (exists) {
      return NextResponse.json({ error: 'Doctor already exists' }, { status: 409 });
    }

    const nextRows = [...rows, ...buildRowsFromDoctor(doctor)];
    await writeRows(nextRows);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create doctor', details: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const doctor = await req.json();
    const validationError = validateDoctorPayload(doctor);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const rows = await readRows();
    const nameKey = normalizeName(doctor.name);
    const filteredRows = rows.filter(row => normalizeName(row.faculty) !== nameKey);

    if (filteredRows.length === rows.length) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }

    const nextRows = [...filteredRows, ...buildRowsFromDoctor(doctor)];
    await writeRows(nextRows);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update doctor', details: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { name } = await req.json();
    const normalized = normalizeName(name);
    if (!normalized) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const rows = await readRows();
    const filteredRows = rows.filter(row => normalizeName(row.faculty) !== normalized);
    if (filteredRows.length === rows.length) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }

    await writeRows(filteredRows);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete doctor', details: error.message }, { status: 500 });
  }
}