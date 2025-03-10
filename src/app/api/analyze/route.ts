import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import OpenAI from 'openai';

// Remove Edge Runtime as it may not be compatible with all dependencies
// export const runtime = 'edge';

// Safe logging of API key format for debugging
const apiKey = process.env.OPENAI_API_KEY || '';
const keyLength = apiKey.length;
const maskedKey = keyLength > 8 
  ? `${apiKey.substring(0, 4)}...${apiKey.substring(keyLength - 4)}` 
  : '(not set)';
const keyType = apiKey.startsWith('sk-') ? 'Standard' : apiKey.startsWith('sk-proj-') ? 'Project' : 'Unknown';

// Validate API key format
const isValidKey = apiKey.startsWith('sk-') && keyLength > 20;
if (!isValidKey) {
  console.error('Invalid OpenAI API key format:', {
    keyLength,
    keyType,
    startsWithSk: apiKey.startsWith('sk-'),
    environment: process.env.NODE_ENV
  });
}

console.log(`API Key: ${maskedKey} (Type: ${keyType}, Length: ${keyLength}, Valid format: ${isValidKey})`);

// Initialize OpenAI client with a longer timeout for paid Vercel plan
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 50000, // 50 seconds timeout
  maxRetries: 2,
});

// Helper function to test OpenAI API connection
async function testOpenAIConnection(): Promise<{success: boolean, error?: string}> {
  try {
    if (!isValidKey) {
      throw new Error('Invalid API key format');
    }

    console.log("Testing OpenAI API connection...");
    const startTime = Date.now();
    
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say hello in Hebrew' }
      ],
      max_tokens: 10,
    });
    
    const elapsed = Date.now() - startTime;
    console.log(`OpenAI test successful in ${elapsed}ms: ${response.choices[0].message.content}`);
    return { success: true };
  } catch (error) {
    console.error("OpenAI API test failed:", {
      error: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.constructor.name : 'Unknown',
      keyInfo: {
        length: keyLength,
        type: keyType,
        valid: isValidKey
      }
    });
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Log environment variables during initialization (masked for security)
console.log(`OpenAI API Key available: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}`);
console.log(`Environment: ${process.env.NODE_ENV}`);

// Run API test on initialization
testOpenAIConnection()
  .then(result => console.log(`API test result: ${result.success ? 'Success' : 'Failed - ' + result.error}`))
  .catch(err => console.error("API test unexpected error:", err));

// Helper function to log execution time
function logTime(label: string, startTime: number) {
  const elapsed = Date.now() - startTime;
  console.log(`${label}: ${elapsed}ms`);
  return elapsed;
}

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
  error?: string;
  details?: unknown;
}

// Define OpenAI error type
interface OpenAIError extends Error {
  status?: number;
  type?: string;
  code?: string;
}

// Configure Vercel serverless function to use maximum timeout for paid plan
export const config = {
  maxDuration: 60, // Maximum 60 seconds for paid Vercel plans
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log(`API request started at: ${new Date().toISOString()}`);
  console.log('Request headers:', Object.fromEntries([...request.headers.entries()]));
  
  try {
    console.log('Starting POST request to /api/analyze');
    
    // Get form data from the request
    let formData;
    try {
      formData = await request.formData();
      console.log('FormData parsed successfully');
    } catch (formError) {
      console.error('Error parsing form data:', formError);
      return NextResponse.json(
        { 
          message: 'שגיאה בקריאת נתוני הטופס',
          error: formError instanceof Error ? formError.message : 'Unknown error',
        },
        { status: 400 }
      );
    }
    
    const files = formData.getAll('files') as File[];
    
    // Get date filters if provided
    const startDateStr = formData.get('startDate') as string | null;
    const endDateStr = formData.get('endDate') as string | null;
    
    console.log(`Files received: ${files.length}`);
    console.log(`Date range: ${startDateStr} to ${endDateStr}`);
    logTime('Request parsing', startTime);
    
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
    
    console.log(`Processed date range: ${startDate?.toISOString()} - ${endDate?.toISOString()}`);
    
    if (files.length === 0) {
      console.log('No files provided in request');
      return NextResponse.json(
        { message: 'לא נמצאו קבצים' },
        { status: 400 }
      );
    }

    // Create a response object with progress steps
    const responseWithProgress = (step: string, data: ResponseData = {}, status: number = 200) => {
      console.log(`Sending response with step: ${step}, status: ${status}`, data);
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
    const fileProcessingStartTime = Date.now();
    const allLinks: string[] = [];
    
    // Step 1: Process zip files
    try {
      for (const file of files) {
        console.log(`Processing file: ${file.name}, size: ${file.size} bytes`);
        
        // Extract data from zip file
        let zipBuffer;
        try {
          zipBuffer = await file.arrayBuffer();
          console.log(`File ${file.name} converted to ArrayBuffer, size: ${zipBuffer.byteLength} bytes`);
        } catch (bufferError) {
          console.error(`Error converting file ${file.name} to ArrayBuffer:`, bufferError);
          throw new Error(`Failed to read file ${file.name}: ${bufferError instanceof Error ? bufferError.message : 'Unknown error'}`);
        }
        
        const zip = new JSZip();
        try {
          await zip.loadAsync(zipBuffer);
          console.log(`ZIP file ${file.name} loaded successfully`);
        } catch (zipError) {
          console.error(`Error loading ZIP file ${file.name}:`, zipError);
          throw new Error(`Failed to extract ZIP file ${file.name}: ${zipError instanceof Error ? zipError.message : 'Unknown error'}`);
        }
        
        // Step 2: Filter by date
        // Find and process the chat files (typically _chat.txt)
        let chatFilesFound = 0;
        for (const fileName in zip.files) {
          if (fileName.endsWith('_chat.txt')) {
            chatFilesFound++;
            console.log(`Processing chat file: ${fileName}`);
            
            let chatFileContent;
            try {
              chatFileContent = await zip.files[fileName].async('string');
              console.log(`Chat file ${fileName} extracted, size: ${chatFileContent.length} chars`);
            } catch (extractError) {
              console.error(`Error extracting chat file ${fileName}:`, extractError);
              continue; // Skip this file but continue with others
            }
            
            // Split by lines and process each line
            const lines = chatFileContent.split('\n');
            console.log(`Total lines in chat file ${fileName}: ${lines.length}`);
            
            let currentDate: Date | null = null;
            let currentLine = '';
            let messagesInRange = 0;
            let messagesWithLinks = 0;
            
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
                    messagesInRange++;
                    const linksInLine = currentLine.match(urlPattern) || [];
                    if (linksInLine.length > 0) {
                      messagesWithLinks++;
                      allLinks.push(...linksInLine);
                    }
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
                messagesInRange++;
                const linksInLine = currentLine.match(urlPattern) || [];
                if (linksInLine.length > 0) {
                  messagesWithLinks++;
                  allLinks.push(...linksInLine);
                }
              }
            }
            
            console.log(`File ${fileName} stats: messages in range: ${messagesInRange}, messages with links: ${messagesWithLinks}`);
          }
        }
        
        if (chatFilesFound === 0) {
          console.log(`No chat files found in ZIP file ${file.name}`);
        }
      }
    } catch (error) {
      console.error('Error processing files:', error);
      return responseWithProgress('idle', { 
        message: 'שגיאה בעיבוד הקבצים',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error 
      }, 500);
    }
    
    const fileProcessingTime = logTime('File processing', fileProcessingStartTime);
    console.log(`File processing completed in ${fileProcessingTime}ms`);
    
    // Remove duplicates
    const uniqueLinks = [...new Set(allLinks)];
    
    console.log(`Found ${uniqueLinks.length} unique links from ${allLinks.length} total links`);
    
    if (uniqueLinks.length === 0) {
      console.log('No links found in the specified date range');
      return responseWithProgress(
        'idle',
        { message: startDate || endDate 
          ? 'לא נמצאו לינקים בטווח התאריכים שנבחר' 
          : 'לא נמצאו לינקים בקבצים' },
        404
      );
    }

    // Strictly limit links to ensure processing completes within timeout
    const MAX_LINKS = 30; // Further reduced limit for higher reliability
    const linksToProcess = uniqueLinks.length > MAX_LINKS 
      ? uniqueLinks.slice(0, MAX_LINKS) 
      : uniqueLinks;
    
    if (uniqueLinks.length > MAX_LINKS) {
      console.log(`Limiting links from ${uniqueLinks.length} to ${MAX_LINKS} to prevent timeout`);
    }

    // Step 4: AI Analysis
    // Generate summary using OpenAI
    const aiStartTime = Date.now();
    try {
      console.log('Sending request to OpenAI...');
      console.log(`OpenAI API Key status: Length=${keyLength}, Type=${keyType}, Valid format=${isValidKey}`);
      
      // Test OpenAI connection before proceeding
      const connectionTest = await testOpenAIConnection();
      if (!connectionTest.success) {
        console.error('OpenAI connection test failed:', connectionTest.error);
        return responseWithProgress('idle', { 
          message: 'שגיאה בחיבור ל-OpenAI',
          error: connectionTest.error,
          details: {
            keyInfo: {
              length: keyLength,
              type: keyType,
              valid: isValidKey
            }
          }
        }, 500);
      }
      
      console.log('OpenAI connection test successful, proceeding with summary generation');
      const summary = await generateSummary(linksToProcess, startDate, endDate);
      const aiTime = logTime('AI processing', aiStartTime);
      console.log('Summary generation successful');
      
      // Log total execution time
      logTime('Total execution time', startTime);
      
      return responseWithProgress('complete', { summary });
    } catch (error) {
      const aiTime = logTime('AI processing (error)', aiStartTime);
      console.error('Error generating summary with OpenAI:', error);
      
      const errorDetails: ResponseData = {
        message: 'שגיאה בניתוח הלינקים',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      
      // Include additional details for debugging
      if (error instanceof Error && 'status' in error) {
        const openAIError = error as OpenAIError;
        errorDetails.details = {
          status: openAIError.status,
          type: openAIError.type,
          aiTimeMs: aiTime,
          totalTimeMs: Date.now() - startTime
        };
      }
      
      // Special handling for timeout errors
      if (error instanceof Error && error.message.includes('timeout') || 
          (error instanceof Error && 'code' in error && (error as OpenAIError).code === 'ETIMEDOUT')) {
        errorDetails.message = 'זמן העיבוד ארוך מדי. אנא נסה עם פחות קבצים או טווח תאריכים קטן יותר.';
      }
      
      return responseWithProgress('idle', errorDetails, 500);
    }
  } catch (error) {
    console.error('Error in POST handler:', error);
    const totalTime = logTime('Total execution time (error)', startTime);
    
    return NextResponse.json(
      { 
        message: 'אירעה שגיאה בעיבוד הקבצים',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: {
          error,
          totalTimeMs: totalTime
        }
      },
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
  console.log(`Starting generateSummary with ${links.length} links`);
  const summaryStartTime = Date.now();
  
  // Get today's date for the summary
  const today = new Date();
  let summaryDateInfo = '';
  
  // Format date for summary
  if (startDate && endDate) {
    // If same day, just use that date
    if (isSameDay(startDate, endDate)) {
      summaryDateInfo = formatDateForSummary(startDate);
    } else {
      // If date range, use today's date
      summaryDateInfo = formatDateForSummary(today);
    }
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

  console.log('Creating OpenAI prompt with links:', links.length);
  console.log('Date range info:', dateRangeInfo || 'None');

  // Strictly limit the number of links to process based on their total length
  const MAX_CHARS = 10000;
  let totalChars = 0;
  const limitedLinks: string[] = [];
  
  for (const link of links) {
    totalChars += link.length;
    
    if (totalChars > MAX_CHARS) {
      console.log(`Reached character limit (${MAX_CHARS}), limiting to ${limitedLinks.length} links`);
      break;
    }
    
    limitedLinks.push(link);
  }
  
  console.log(`Using ${limitedLinks.length} links in prompt (${totalChars} chars)`);
  
  const prompt = `
    אני מנהל קהילה של יזמי סולו ואני רוצה לסכם לינקים שפורסמו בקבוצות וואטסאפ שלנו ${dateRangeInfo ? dateRangeInfo : ''}.
    
    להלן רשימת הלינקים שפורסמו:
    ${limitedLinks.join('\n')}
    
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

  console.log('Making API call to OpenAI');
  console.log(`Prompt length: ${prompt.length} characters`);
  
  try {
    console.log('Attempting OpenAI API call with gpt-3.5-turbo');
    const apiCallStartTime = Date.now();
    
    // First try with GPT-3.5 for speed
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // Use faster model for production
      messages: [
        { role: 'system', content: 'אתה עוזר מועיל המתמחה בארגון וסיכום מידע עבור קבוצות וואטסאפ. כתוב בעברית, מימין לשמאל.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000, // Reduce tokens for faster response
    });
    
    const apiCallTime = Date.now() - apiCallStartTime;
    console.log(`OpenAI API call succeeded in ${apiCallTime}ms`);
    console.log(`Response tokens: ${response.usage?.total_tokens || 'unknown'}`);
    
    const totalTime = Date.now() - summaryStartTime;
    console.log(`Total summary generation time: ${totalTime}ms`);
    
    return response.choices[0].message.content || 'לא הצלחתי לייצר סיכום';
  } catch (error) {
    console.error('Error in OpenAI API call:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.constructor.name : 'Unknown',
      code: error instanceof Error && 'code' in error ? (error as OpenAIError).code : 'No code',
      status: error instanceof Error && 'status' in error ? (error as OpenAIError).status : 'No status'
    });
    
    // If we get a timeout error, use a much simpler prompt
    if (error instanceof Error && 
        (error.message.includes('timeout') || 
        ('code' in error && (error as OpenAIError).code === 'ETIMEDOUT'))) {
      
      console.log('Timeout occurred, trying with simplified prompt');
      
      try {
        console.log('Attempting fallback with simplified prompt');
        const fallbackStartTime = Date.now();
        
        // Use a bare minimum approach
        const simplifiedPrompt = `סכם את הלינקים הבאים בקצרה:
          ${limitedLinks.slice(0, 20).join('\n')}
          
          התחל את הסיכום עם: "*סיכום לינקים ליזמי סולו:*"
          בשורה השניה הוסף: "תאריך-${summaryDateInfo}"
        `;
        
        console.log(`Simplified prompt length: ${simplifiedPrompt.length} characters`);
        
        const fallbackResponse = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'תן תשובה קצרה בעברית.' },
            { role: 'user', content: simplifiedPrompt }
          ],
          temperature: 0.5,
          max_tokens: 1000,
        });
        
        const fallbackTime = Date.now() - fallbackStartTime;
        console.log(`Fallback API call succeeded in ${fallbackTime}ms`);
        
        return fallbackResponse.choices[0].message.content || 'לא הצלחתי לייצר סיכום';
      } catch (fallbackError) {
        console.error('Even fallback approach failed:', fallbackError);
        
        // If even the simplified approach fails, return a basic message
        console.log('Returning basic formatted links as fallback');
        return `*סיכום לינקים ליזמי סולו:*
תאריך-${summaryDateInfo}

*לינקים שנמצאו:*
${limitedLinks.slice(0, 10).map(link => `- ${link}`).join('\n')}

(הסיכום נכשל עקב עומס - הצגת לינקים בלבד)`;
      }
    }
    
    // Re-throw the error with more context
    throw new Error(`OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 