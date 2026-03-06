import { NextResponse } from 'next/server';
import { 
  searchOfficeHours, 
  suggestClosestProfessors,
  getAllOfficeHours, 
  extractQueryContext, 
  generateSmartResponse,
  isSimpleNameSearch,
  generateDisambiguationMessage 
} from '../../../lib/getOfficeHours.js';

export async function POST(req) {
  try {
    const { message } = await req.json();

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Search for relevant office hours data
    const query = message.toLowerCase();
    
    // Check if the user is asking for professor information (schedule/contact/department)
    const isOfficeHoursQuery =
      query.includes('office') ||
      query.includes('hours') ||
      query.includes('meet') ||
      query.includes('available') ||
      query.includes('when') ||
      query.includes('schedule') ||
      query.includes('email') ||
      query.includes('contact') ||
      query.includes('department') ||
      query.includes('dr ') ||
      query.includes('eng ') ||
      query.split(' ').length <= 4;

    const results = await searchOfficeHours(message);

    // Deterministic structured responses.
    if (results.length > 0) {
      const context = extractQueryContext(message);
      
      // Single result - generate smart response
      if (results.length === 1) {
        const smartResponse = generateSmartResponse(results[0], message);
        
        return NextResponse.json({
          type: 'smart_response',
          response: smartResponse,
          results: results,
          count: 1,
          context: context,
          timestamp: new Date().toISOString(),
          model: 'smart_structured'
        });
      }
      
      // Multiple results - check if it's a simple name search
      if (isSimpleNameSearch(message) && results.length > 1 && results.length <= 10) {
        // User typed a simple name (like "razan") - ask which one they want
        const disambiguation = generateDisambiguationMessage(message, results);
        
        return NextResponse.json({
          type: 'disambiguation',
          message: disambiguation.message,
          options: disambiguation.options,
          count: results.length,
          timestamp: new Date().toISOString(),
          model: 'smart_structured'
        });
      }

      // If user asked for a specific field (email/office/hours) but multiple similar names match,
      // force disambiguation so we return the exact requested person's answer next.
      if ((context.wantsEmail || context.wantsOffice || context.wantsHours) && results.length > 1 && results.length <= 10) {
        const disambiguation = generateDisambiguationMessage(message, results);

        return NextResponse.json({
          type: 'disambiguation',
          message: disambiguation.message,
          options: disambiguation.options,
          count: results.length,
          timestamp: new Date().toISOString(),
          model: 'smart_structured'
        });
      }
      
      // Multiple results with full query - return for frontend to display as list
      return NextResponse.json({
        type: 'office_hours',
        results: results,
        count: results.length,
        context: context,
        timestamp: new Date().toISOString(),
        model: 'structured'
      });
    } else if (isOfficeHoursQuery) {
      const suggestions = await suggestClosestProfessors(message, 5);
      const allProfessors = await getAllOfficeHours();

      const guidance = suggestions.length > 0
        ? 'I could not find an exact match, but I found similar names you can select.'
        : `I could not find a matching professor name in the current dataset of ${allProfessors.length} members.`;

      const hints = suggestions.length > 0
        ? [
            'Pick one of the suggested names below.',
            'Or type the full name as it appears in university records.'
          ]
        : [
            'Try typing part of the email (example: murad.yaghi).',
            'Try a shorter or alternate spelling of the name (example: Ahmad/Ahmed).',
            'Use "By department" to browse all available records.'
          ];

      return NextResponse.json({
        type: 'no_results',
        message: message,
        guidance,
        hints,
        datasetCount: allProfessors.length,
        suggestions: suggestions.map(item => ({
          professor: item.professor,
          name: item.name,
          department: item.department,
          email: item.email,
          office: item.office
        })),
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json({
        type: 'help',
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process message', details: error.message },
      { status: 500 }
    );
  }
}

// Optional: GET endpoint to retrieve all office hours
export async function GET() {
  try {
    const allData = await getAllOfficeHours();
    return NextResponse.json({
      count: allData.length,
      professors: allData.map(d => d.professor),
      lastUpdated: allData[0]?.lastUpdated || null
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch office hours' },
      { status: 500 }
    );
  }
}
