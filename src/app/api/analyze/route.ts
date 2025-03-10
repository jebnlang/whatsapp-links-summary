import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Regex pattern to find links
const urlPattern = /(https?:\/\/[^\s]+)/g;

// Regex pattern to match WhatsApp date format
// Example: [3/10/24, 2:34:56 PM]
const datePattern = /\[(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(\d{1,2}:\d{1,2}(?::\d{1,2})?\s*(?:AM|PM)?)\]/;

// Extracts date from a WhatsApp message line
function extractDateFromMessage(messageLine: string): Date | null {
  const match = messageLine.match(datePattern);
  if (!match) return null;
  
  const dateStr = match[1];
  const timeStr = match[2];
  
  // Parse date parts - format could be MM/DD/YY or DD/MM/YY depending on locale
  // We'll assume DD/MM/YY format as common in many countries
  const [day, month, year] = dateStr.split('/').map(Number);
  
  // Convert 2-digit year to 4-digit year
  const fullYear = year < 100 ? (year < 50 ? 2000 + year : 1900 + year) : year;
  
  // Parse time
  let hour = 0, minute = 0, second = 0;
  const timeParts = timeStr.trim().split(':');
  hour = parseInt(timeParts[0], 10);
  minute = parseInt(timeParts[1], 10);
  
  // Check if there are seconds
  if (timeParts.length > 2) {
    // If seconds exist, they might have AM/PM attached
    const secondPart = timeParts[2];
    if (secondPart.includes('AM') || secondPart.includes('PM')) {
      second = parseInt(secondPart.split(' ')[0], 10);
      
      // Adjust hour for PM
      if (secondPart.includes('PM') && hour < 12) {
        hour += 12;
      }
      // Adjust hour for AM
      if (secondPart.includes('AM') && hour === 12) {
        hour = 0;
      }
    } else {
      second = parseInt(secondPart, 10);
    }
  }
  
  return new Date(fullYear, month - 1, day, hour, minute, second);
}

// Utility function to set a date to the start of the day (00:00:00)
function setToStartOfDay(date: Date): Date {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
}

// Utility function to set a date to the end of the day (23:59:59.999)
function setToEndOfDay(date: Date): Date {
  const newDate = new Date(date);
  newDate.setHours(23, 59, 59, 999);
  return newDate;
}

// Utility function to check if two dates are the same day (ignoring time)
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

// Format date for display in the summary (DD.MM format)
function formatDateForSummary(date: Date): string {
  return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}`;
}

// Define a type for the response data
interface ResponseData {
  summary?: string;
  message?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Get form data from the request
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    
    // Get date filters if provided
    const startDateStr = formData.get('startDate') as string | null;
    const endDateStr = formData.get('endDate') as string | null;
    
    // Parse date filters
    let startDate = startDateStr ? new Date(startDateStr) : null;
    let endDate = endDateStr ? new Date(endDateStr) : null;
    
    // Adjust dates if both are provided
    if (startDate && endDate) {
      // If same day is selected, set start to beginning of day and end to end of day
      if (isSameDay(startDate, endDate)) {
        startDate = setToStartOfDay(startDate);
        endDate = setToEndOfDay(endDate);
      } else {
        // If different days, ensure start date is at beginning of day
        startDate = setToStartOfDay(startDate);
        // And end date is at end of day
        endDate = setToEndOfDay(endDate);
      }
    } else if (startDate) {
      // If only start date is provided, set it to beginning of day
      startDate = setToStartOfDay(startDate);
    } else if (endDate) {
      // If only end date is provided, set it to end of day
      endDate = setToEndOfDay(endDate);
    }
    
    console.log(`Date range: ${startDate?.toISOString()} - ${endDate?.toISOString()}`);
    
    if (files.length === 0) {
      return NextResponse.json(
        { message: 'לא נמצאו קבצים' },
        { status: 400 }
      );
    }

    // Create a response object with progress steps
    const responseWithProgress = (step: string, data: ResponseData = {}, status: number = 200) => {
      return NextResponse.json(
        data,
        { 
          status,
          headers: {
            'X-Process-Step': step
          }
        }
      );
    };

    // Process all files
    const allLinks: string[] = [];
    
    // Step 1: Process zip files
    try {
      for (const file of files) {
        // Extract data from zip file
        const zipBuffer = await file.arrayBuffer();
        const zip = new JSZip();
        await zip.loadAsync(zipBuffer);
        
        // Step 2: Filter by date
        // Find and process the chat files (typically _chat.txt)
        for (const fileName in zip.files) {
          if (fileName.endsWith('_chat.txt')) {
            const chatFileContent = await zip.files[fileName].async('string');
            
            // Split by lines and process each line
            const lines = chatFileContent.split('\n');
            
            let currentDate: Date | null = null;
            let currentLine = '';
            
            // Step 3: Extract links
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              
              // Check if line starts with a date
              const dateMatch = line.match(datePattern);
              
              if (dateMatch) {
                // Process previous line if it exists and contains links
                if (currentLine && currentDate) {
                  // Check if the message is within the date range
                  const isInRange = (!startDate || currentDate >= startDate) && 
                                    (!endDate || currentDate <= endDate);
                  
                  if (isInRange) {
                    const linksInLine = currentLine.match(urlPattern) || [];
                    allLinks.push(...linksInLine);
                  }
                }
                
                // Extract the new date and start a new message
                currentDate = extractDateFromMessage(line);
                currentLine = line;
              } else {
                // Continue current message
                currentLine += ' ' + line;
              }
            }
            
            // Process the last line if necessary
            if (currentLine && currentDate) {
              const isInRange = (!startDate || currentDate >= startDate) && 
                                (!endDate || currentDate <= endDate);
              
              if (isInRange) {
                const linksInLine = currentLine.match(urlPattern) || [];
                allLinks.push(...linksInLine);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error processing files:', error);
      return responseWithProgress('idle', { message: 'שגיאה בעיבוד הקבצים' }, 500);
    }
    
    // Remove duplicates
    const uniqueLinks = [...new Set(allLinks)];
    
    console.log(`Found ${uniqueLinks.length} unique links`);
    
    if (uniqueLinks.length === 0) {
      return responseWithProgress(
        'idle',
        { message: startDate || endDate 
          ? 'לא נמצאו לינקים בטווח התאריכים שנבחר' 
          : 'לא נמצאו לינקים בקבצים' },
        404
      );
    }

    // Step 4: AI Analysis
    // Generate summary using OpenAI
    try {
      const summary = await generateSummary(uniqueLinks, startDate, endDate);
      return responseWithProgress('complete', { summary });
    } catch (error) {
      console.error('Error generating summary:', error);
      return responseWithProgress('idle', { message: 'שגיאה בניתוח הלינקים' }, 500);
    }
  } catch (error) {
    console.error('Error processing files:', error);
    return NextResponse.json(
      { message: 'אירעה שגיאה בעיבוד הקבצים' },
      { 
        status: 500,
        headers: {
          'X-Process-Step': 'idle'
        }
      }
    );
  }
}

async function generateSummary(
  links: string[], 
  startDate: Date | null = null, 
  endDate: Date | null = null
): Promise<string> {
  try {
    // Get current date for the summary header
    const today = new Date();
    
    // Prepare date information for the summary header
    let summaryDateInfo = '';
    
    if (startDate && endDate) {
      // If same day, just mention the specific date
      if (isSameDay(startDate, endDate)) {
        summaryDateInfo = formatDateForSummary(startDate);
      } else {
        summaryDateInfo = `${formatDateForSummary(startDate)}-${formatDateForSummary(endDate)}`;
      }
    } else if (startDate) {
      summaryDateInfo = `החל מ-${formatDateForSummary(startDate)}`;
    } else if (endDate) {
      summaryDateInfo = `עד ${formatDateForSummary(endDate)}`;
    } else {
      // If no date range specified, use today's date
      summaryDateInfo = formatDateForSummary(today);
    }
    
    // Add date range information to the prompt if available
    let dateRangeInfo = '';
    if (startDate && endDate) {
      // If same day, just mention the specific date
      if (isSameDay(startDate, endDate)) {
        dateRangeInfo = `מתאריך ${startDate.toLocaleDateString('he-IL')}`;
      } else {
        dateRangeInfo = `בין התאריכים ${startDate.toLocaleDateString('he-IL')} ל-${endDate.toLocaleDateString('he-IL')}`;
      }
    } else if (startDate) {
      dateRangeInfo = `החל מתאריך ${startDate.toLocaleDateString('he-IL')}`;
    } else if (endDate) {
      dateRangeInfo = `עד לתאריך ${endDate.toLocaleDateString('he-IL')}`;
    }

    const prompt = `
      אני מנהל קהילה של יזמי סולו ואני רוצה לסכם לינקים שפורסמו בקבוצות וואטסאפ שלנו ${dateRangeInfo ? dateRangeInfo : ''}.
      
      להלן רשימת הלינקים שפורסמו:
      ${links.join('\n')}
      
      אנא צור סיכום מסודר וברור של הלינקים הללו, עם החלוקה הבאה:
      1. התחל את הסיכום עם כותרת "*סיכום לינקים ליזמי סולו:*"
      2. מיד אחרי הכותרת, הוסף שורה עם תאריך הסיכום: "תאריך-${summaryDateInfo}"
      3. חלק את הלינקים לקטגוריות הגיוניות לפי תוכנם (כמו כלים ליזמים, פלטפורמות בנייה, מאמרים, פוסטים וכו')
      4. עבור כל לינק, תן כותרת קצרה ותיאור מה הוא מכיל ולמה הוא שימושי
      5. סדר את הלינקים בכל קטגוריה לפי רלוונטיות
      
      הנחיות לפורמט: 
      - הסיכום צריך להיות בעברית, מימין לשמאל
      - השתמש באסטריקס אחד (*) בהתחלה ובסוף בשביל טקסט מודגש, ולא שניים - למשל: *כותרת* ולא **כותרת**
      - אל תשתמש במספור (1, 2, 3) בשום מקום בסיכום, במקום זה השתמש במקפים (-) בתחילת כל פריט
      - כאשר אתה מציג לינק, כתוב תחילה את שם האתר או הכלי מודגש עם כוכבית אחת, לדוגמה: *שם הכלי* - תיאור הכלי.
      - לאחר מכן השתמש בקו מפריד ואז כתוב את הלינק בשורה נפרדת: "לינק: https://example.com"
      - אל תשתמש בקו חדש אחרי המילה "לינק:" - כתוב את הלינק באותה שורה
      - מספר את הקטגוריות (לא את הפריטים) בצורה ברורה ויישר אותן לימין
      - בנה פסקאות קצרות וברורות
      - הסיכום צריך להיות קל להעתקה והדבקה לקבוצת וואטסאפ
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: 'אתה עוזר מועיל המתמחה בארגון וסיכום מידע עבור קבוצות וואטסאפ. יש לך ידע על פורמט הטקסט בוואטסאפ ועל איך ליצור תוכן שיהיה נראה טוב בוואטסאפ. אתה יודע שוואטסאפ תומך בטקסט מימין לשמאל (RTL) ואתה מקפיד ליצור פורמט שיהיה נכון ויפה בוואטסאפ.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    return response.choices[0].message.content || 'לא הצלחתי לייצר סיכום';
  } catch (error) {
    console.error('Error generating summary with OpenAI:', error);
    return 'שגיאה בעת יצירת הסיכום. אנא נסה שוב מאוחר יותר.';
  }
} 