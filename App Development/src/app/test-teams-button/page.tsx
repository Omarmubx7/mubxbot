import React from 'react';
import { OfficeHoursDisplay } from '@/app/components/office-hours-display';

/**
 * Test/Demo page for Teams Button
 * Route: /test-teams-button (or add to existing page)
 * 
 * This shows how the button works with sample data
 */

export default function TeamsButtonTestPage() {
  // Sample office hours data (from office_hours.json structure)
  const sampleOfficeHours = [
    {
      faculty: "As'har Khamaiseh- أسحار",
      department: "Cyber Security",
      email: "ashar.khamaiseh@htu.edu.jo",
      office: "S-311",
      day: "Saturday",
      start: "8:30",
      end: "10:00",
      type: "In-Person"
    },
    {
      faculty: "As'har Khamaiseh- أسحار",
      department: "Cyber Security",
      email: "ashar.khamaiseh@htu.edu.jo",
      office: "S-311",
      day: "Sunday",
      start: "10:00",
      end: "11:00",
      type: "In-Person"
    },
    {
      faculty: "As'har Khamaiseh- أسحار",
      department: "Cyber Security",
      email: "ashar.khamaiseh@htu.edu.jo",
      office: "S-311",
      day: "Monday",
      start: "11:00",
      end: "1:00",
      type: "In-Person"
    },
    {
      faculty: "As'har Khamaiseh- أسحار",
      department: "Cyber Security",
      email: "ashar.khamaiseh@htu.edu.jo",
      office: "S-311",
      day: "Tuesday",
      start: "1:00",
      end: "2:30",
      type: "In-Person"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Teams Button Test
          </h1>
          <p className="text-slate-600">
            Click the "Open in Teams" button to test the Teams integration
          </p>
        </div>

        {/* Display office hours with Teams button */}
        <OfficeHoursDisplay
          officeHours={sampleOfficeHours}
          faculty="As'har Khamaiseh- أسحار"
          email="ashar.khamaiseh@htu.edu.jo"
        />

        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h2 className="font-semibold text-blue-900 mb-2">How to Test:</h2>
          <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
            <li>Click the <strong>"Open in Teams"</strong> button above</li>
            <li>Teams will open in a new tab with the faculty email auto-searched</li>
            <li>Click on the faculty member's name in the search results</li>
            <li>A chat window should open</li>
          </ol>
        </div>

        <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h2 className="font-semibold text-green-900 mb-2">✓ What Works:</h2>
          <ul className="list-disc list-inside text-sm text-green-800 space-y-1">
            <li>Button opens Teams web interface</li>
            <li>Faculty email is automatically searched</li>
            <li>Office hours display looks great</li>
            <li>Works on all devices (web, mobile, desktop)</li>
            <li>No database setup needed</li>
          </ul>
        </div>

        <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <h2 className="font-semibold text-amber-900 mb-2">📝 Next Steps:</h2>
          <ol className="list-decimal list-inside text-sm text-amber-800 space-y-1">
            <li>Import OfficeHoursDisplay in your chat page</li>
            <li>When chatbot returns office hours, render with this component</li>
            <li>Users click button to find and chat with faculty</li>
            <li>Done! 🎉</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
