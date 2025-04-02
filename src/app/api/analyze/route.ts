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
      model: 'gpt-4o-mini-2024-07-18',
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

// Simplified but more inclusive URL pattern that will catch both full URLs and domain-only links
// Updated TLD part to [a-zA-Z]{2,6} to avoid matching numbers like '.0'
const urlPattern = /((?:https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z]{2,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&//=]*))/gi;

// Updated regex pattern to match multiple WhatsApp date formats
// Now more strict about the format to ensure consistent parsing
const datePattern = /(?:\[)?(\d{1,2})[\.\/\-](\d{1,2})[\.\/\-](\d{2,4}),\s*(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?\s*(?:AM|PM)?(?:\])?(?:\s*-)?/i;

// New regex pattern to extract the sender name from WhatsApp messages with improved handling of format variations
// Matches patterns like:
// ~ David Horesh: message
// Idan Openweb: message
// ~ Adir: message
const senderPattern = /(?:\]\s*)(?:-?\s*)?(?:~?\s*)?([^:]+):/i;

// Extracts date from a WhatsApp message line with improved parsing
function extractDateFromMessage(messageLine: string): Date | null {
  const match = messageLine.match(datePattern);
  if (!match) {
    console.log(`No date pattern match found in line: "${messageLine.substring(0, 50)}..."`);
    return null;
  }
  
  // Extract components from regex match
  const [_, dayStr, monthStr, yearStr, hourStr, minuteStr, secondStr] = match;
  
  console.log(`Parsing date components:`, {
    day: dayStr,
    month: monthStr,
    year: yearStr,
    hour: hourStr,
    minute: minuteStr,
    second: secondStr
  });

  // Parse numeric values
  const day = parseInt(dayStr, 10);
  const month = parseInt(monthStr, 10);
  let year = parseInt(yearStr, 10);
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);
  const second = secondStr ? parseInt(secondStr, 10) : 0;

  // Validate basic ranges
  if (month < 1 || month > 12) {
    console.log(`Invalid month value: ${month}`);
    return null;
  }
  
  // Get days in the specific month
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) {
    console.log(`Invalid day value: ${day} for month: ${month}`);
    return null;
  }

  // Handle 2-digit years
  if (year < 100) {
    year = year <= 49 ? 2000 + year : 1900 + year;
    console.log(`Converted 2-digit year ${yearStr} to ${year}`);
  }

  // Validate year is reasonable (not too old or in future)
  const currentYear = new Date().getFullYear();
  if (year < currentYear - 5 || year > currentYear + 1) {
    console.log(`Year ${year} outside reasonable range`);
    return null;
  }

  // Validate time components
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) {
    console.log(`Invalid time values - hour: ${hour}, minute: ${minute}, second: ${second}`);
    return null;
  }

  try {
    // Use Date.UTC to treat the parsed components as UTC directly
    const utcTimestamp = Date.UTC(year, month - 1, day, hour, minute, second);
    const parsedDate = new Date(utcTimestamp);
    // Log the parsed date in UTC for consistency
    console.log(`Parsed date (UTC): ${parsedDate.toISOString()}`);
    return parsedDate;
  } catch (e) {
    console.error('Error creating date object:', e);
    return null;
  }
}

// Utility function to set a date to the start of the day UTC (00:00:00)
function setToStartOfDayUTC(date: Date): Date {
  const newDate = new Date(date);
  newDate.setUTCHours(0, 0, 0, 0); // Use UTC method
  return newDate;
}

// Utility function to set a date to the end of the day UTC (23:59:59.999)
function setToEndOfDayUTC(date: Date): Date {
  const newDate = new Date(date);
  newDate.setUTCHours(23, 59, 59, 999); // Use UTC method
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

// --- JSON Mode Schema Definitions ---

interface SummarizedLink {
  name: string;        // Name of the tool/site
  type: string;        // Type: SaaS, article, video, etc.
  description: string; // Short description
  context?: string;     // Context from the message (optional)
  keyPoints: string[]; // 2-3 key points/features
  userValue: string;   // Value for the target audience
  complexity?: string;  // Optional: Estimated time/complexity
  url: string;         // The actual URL
}

// The main structure: Category names mapped to arrays of links
// Using Record<string, SummarizedLink[]> for dynamic category names
type SummaryJson = Record<string, SummarizedLink[]>;

// --- End JSON Mode Schema Definitions ---

// New interface to store links with their context
interface LinkWithContext {
  url: string;
  messageContext: string; // Snippet around the link for AI prompt
  fullMessageText?: string; // Full message text (cleaned) for final display
  date: Date;
  groupName?: string;
  sender?: string;
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

// Debugging helper to log link extraction process
function logLinkExtraction(lineNumber: number, line: string, links: RegExpMatchArray[]): void {
  if (links.length > 0) {
    console.log(`Found ${links.length} links at line ${lineNumber}:`, 
      links.map(l => l[0]).join(', ').substring(0, 100) + (links.map(l => l[0]).join(', ').length > 100 ? '...' : ''));
  }
}

// Check if a string is likely a WhatsApp system message
function isSystemMessage(message: string): boolean {
  return message.includes('הצטרף/ה') || 
         message.includes('עזב/ה') || 
         message.includes('שינה/תה את נושא הקבוצה') ||
         message.includes('changed the subject') ||
         message.includes('joined using') ||
         message.includes('left');
}

// Extract links from a message with context
function extractLinksWithContext(
  fullCleanedMessage: string, // Accept the full cleaned message
  messageDate: Date, 
  lineNumber: number
): LinkWithContext[] {
  const extractedLinks: LinkWithContext[] = [];
  
  // Use the full message for system message check
  if (!fullCleanedMessage || isSystemMessage(fullCleanedMessage)) {
    return extractedLinks;
  }
  
  // Use the full message for direct check
  if (fullCleanedMessage.toLowerCase().includes('get-zenith.com')) {
    console.log(`Found Get-zenith.com at line ${lineNumber} through direct check`);
    extractedLinks.push({
      url: 'Get-zenith.com',
      messageContext: fullCleanedMessage.substring(0, 300), // Provide a snippet for context
      fullMessageText: fullCleanedMessage,
      date: messageDate
    });
  }
  
  // Use the full message to find links
  const linksInMessage = Array.from(fullCleanedMessage.matchAll(urlPattern));
  
  if (linksInMessage.length > 0) {
    logLinkExtraction(lineNumber, fullCleanedMessage, linksInMessage);
    
    linksInMessage.forEach(match => {
      // Calculate snippet context based on link position in the full message
      const linkIndex = match.index || 0;
      const startContext = Math.max(0, linkIndex - 100);
      const endContext = Math.min(fullCleanedMessage.length, linkIndex + match[0].length + 100);
      const linkContextSnippet = fullCleanedMessage.substring(startContext, endContext).trim();
      
      extractedLinks.push({
        url: match[0],
        messageContext: linkContextSnippet, // Store the snippet for AI prompt
        fullMessageText: fullCleanedMessage, // Store the full cleaned message
        date: messageDate
      });
    });
  }
  
  return extractedLinks;
}

// Helper function to extract group name from filename
function extractGroupName(fileName: string): string | undefined {
  let match;

  // 1. Try standard format: "WhatsApp Chat with [Group Name]_chat.txt" (or without _chat)
  match = fileName.match(/^WhatsApp Chat with (.*?)(?:_chat)?\.txt$/i);
  if (match && match[1]) {
    console.log(`extractGroupName: Matched Pattern 1 for ${fileName}`);
    return match[1].trim();
  }

  // 2. Try user's format: "WhatsApp Chat - [Group Name].(txt|zip)"
  match = fileName.match(/^WhatsApp Chat - (.*?)\.(?:txt|zip)$/i);
  if (match && match[1]) {
    console.log(`extractGroupName: Matched Pattern 2 for ${fileName}`);
    return match[1].trim();
  }

  // 3. Try generic format: "[Group Name].txt" (but avoid generic names)
  match = fileName.match(/^(.*?)\.txt$/i);
  if (match && match[1]) {
    const potentialName = match[1].trim();
    // Avoid matching just '_chat' or other likely non-names if it's the only pattern that matched
    if (potentialName.toLowerCase() !== '_chat' && !potentialName.toLowerCase().startsWith('whatsapp chat')) {
         console.log(`extractGroupName: Matched Pattern 3 for ${fileName}`);
         return potentialName;
    }
  }

  console.log(`extractGroupName: No pattern matched for ${fileName}`);
  return undefined; // Return undefined if no suitable name could be extracted
}

// Extract sender name from a message line
function extractSender(messageLine: string): string | undefined {
  const match = messageLine.match(senderPattern);
  if (match && match[1]) {
    // Clean up the sender name (remove any trailing ~ if present)
    let sender = match[1].trim();
    
    // Remove "requested to join" or other system message indicators if present
    if (sender.includes('requested to join')) {
      sender = sender.split('requested to join')[0].trim();
    }
    
    // In case there are multiple tildes, clean them up
    sender = sender.replace(/^~+\s*/, '').trim();
    
    return sender;
  }
  return undefined;
}

export async function POST(request: NextRequest): Promise<NextResponse<ResponseData>> {
  const startTime = Date.now();
  console.log(`Starting file processing at ${new Date().toISOString()}`);
  
  try {
    // Extract form data with files
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    
    // Extract date filters if provided
    const startDateStr = formData.get('startDate') as string | null;
    const endDateStr = formData.get('endDate') as string | null;
    
    console.log(`Files submitted: ${files.length}`);
    console.log(`Date range: ${startDateStr || 'none'} to ${endDateStr || 'none'}`);
    
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    
    // Parse date strings if provided
    if (startDateStr) {
      try {
        startDate = new Date(startDateStr);
        startDate = setToStartOfDayUTC(startDate); // Use UTC for consistency
        console.log(`Parsed start date: ${startDate.toISOString()}`);
      } catch (e) {
        console.error('Invalid start date:', startDateStr, e);
      }
    }
    
    if (endDateStr) {
      try {
        endDate = new Date(endDateStr);
        endDate = setToEndOfDayUTC(endDate); // Use UTC for consistency
        console.log(`Parsed end date: ${endDate.toISOString()}`);
      } catch (e) {
        console.error('Invalid end date:', endDateStr, e);
      }
    }
    
    // Test OpenAI connectivity at the start of each request
    const apiTestResult = await testOpenAIConnection();
    if (!apiTestResult.success) {
      console.error('OpenAI API test failed at request start:', apiTestResult.error);
      return NextResponse.json({ 
        error: 'OpenAI API is not available', 
        details: apiTestResult.error 
      }, { status: 500 });
    }
    
    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    // Process each file to extract links
    const allLinksWithContext: LinkWithContext[] = [];
    
    for (const file of files) {
      const fileName = file.name;
      let fileContent: string;
      const groupName = extractGroupName(fileName);
      console.log(`Processing file: ${fileName} (Group: ${groupName || 'unknown'})`);
      
      try {
        // Handle zip files (extract and process each .txt file)
        if (fileName.toLowerCase().endsWith('.zip')) {
          console.log(`Processing ZIP file: ${fileName}`);
          const buffer = await file.arrayBuffer();
          const zip = await JSZip.loadAsync(buffer);
          
          const zipFilesPromises: Promise<void>[] = [];
          
          zip.forEach((relativePath, zipEntry) => {
            // Only process text files from the zip
            if (!zipEntry.dir && relativePath.toLowerCase().endsWith('.txt')) {
              const promise = zipEntry.async('string').then(content => {
                console.log(`Processing ZIP entry: ${relativePath}`);
                const chatFileGroupName = extractGroupName(relativePath) || groupName;
                processFileContent(content, chatFileGroupName, relativePath, allLinksWithContext, startDate, endDate);
              });
              zipFilesPromises.push(promise);
            }
          });
          
          await Promise.all(zipFilesPromises);
          console.log(`Completed processing of all entries in ZIP file: ${fileName}`);
        } else {
          // Handle regular text files
          const buffer = await file.arrayBuffer();
          const decoder = new TextDecoder('utf-8');
          fileContent = decoder.decode(buffer);
          processFileContent(fileContent, groupName, fileName, allLinksWithContext, startDate, endDate);
        }
      } catch (error) {
        console.error(`Error processing file ${fileName}:`, error);
        return NextResponse.json({ 
          error: `Error processing file: ${fileName}`, 
          details: error instanceof Error ? error.message : 'Unknown error' 
        }, { status: 500 });
      }
    }
    
    const processingTime = logTime(`Total processing time for ${files.length} files`, startTime);
    
    if (allLinksWithContext.length === 0) {
      return NextResponse.json({ 
        summary: 'לא נמצאו לינקים בתקופה המבוקשת', 
        message: 'No links found in the specified files or date range' 
      });
    }
    
    // Sort links by date (newest first)
    allLinksWithContext.sort((a, b) => b.date.getTime() - a.date.getTime());
    console.log(`Total links found: ${allLinksWithContext.length}`);
    
    // Determine date range for the summary
    const oldestDate = allLinksWithContext[allLinksWithContext.length - 1].date;
    const newestDate = allLinksWithContext[0].date;
    
    let dateRangeInfo: string;
    let summaryDateInfo: string;
    
    if (isSameDay(oldestDate, newestDate)) {
      // Single day summary
      summaryDateInfo = formatDateForSummary(newestDate);
      dateRangeInfo = `תאריך: ${summaryDateInfo}`;
    } else {
      // Date range summary
      const oldestDateStr = formatDateForSummary(oldestDate);
      const newestDateStr = formatDateForSummary(newestDate);
      summaryDateInfo = `${oldestDateStr}-${newestDateStr}`;
      dateRangeInfo = `טווח תאריכים: ${oldestDateStr} - ${newestDateStr}`;
    }
    
    console.log(`Date range for summary: ${dateRangeInfo}`);
    
    // Generate the summary with OpenAI
    const summary = await generateSummary(allLinksWithContext, dateRangeInfo, summaryDateInfo);
    
    return NextResponse.json({ summary });
    
  } catch (error) {
    console.error('Error in main process:', error);
    return NextResponse.json({ 
      error: 'Failed to process the files', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// Processes content from a single file and extracts links
function processFileContent(
  fileContent: string, 
  groupName: string | undefined, 
  fileName: string, 
  allLinksWithContext: LinkWithContext[], 
  startDate: Date | null, 
  endDate: Date | null
): void {
  console.log(`Starting to process content from ${fileName} (${fileContent.length} characters)`);
  
  const lines = fileContent.split(/\r?\n/);
  console.log(`File has ${lines.length} lines`);
  
  let currentDate: Date | null = null;
  let multiLineMessage = '';
  let inMultiLineMode = false;
  let senderForMultiLine: string | undefined;
  
  // Process the file line by line
  for (let i = 0; i < lines.length; i++) {
    const currentLine = lines[i];
    const lineNum = i + 1;
    
    // Debugging output at certain intervals
    if (lineNum % 1000 === 0) {
      console.log(`Processing line ${lineNum}/${lines.length} from ${fileName}`);
    }
    
    // Skip empty lines
    if (!currentLine.trim()) {
      continue;
    }
    
    // First, check if this is a new message by looking for a date pattern
    const hasDatePattern = datePattern.test(currentLine);
    
    if (hasDatePattern) {
      // It's a new message with timestamp, so process any previous multi-line message first
      if (inMultiLineMode && multiLineMessage && currentDate) {
        processMessage(multiLineMessage, currentDate, allLinksWithContext, lineNum - 1, startDate, endDate, groupName, senderForMultiLine);
      }
      
      // Extract date from the message
      currentDate = extractDateFromMessage(currentLine);
      
      // Extract sender from the current line
      senderForMultiLine = extractSender(currentLine);
      
      if (currentDate) {
        // Check date filtering if applicable
        if (shouldSkipDate(currentDate, startDate, endDate)) {
          currentDate = null; // Reset to skip this message
          continue;
        }
        
        // This is a new message, so start multi-line mode with the cleaned message
        // Remove date and time pattern from the beginning
        const cleanedMessage = currentLine.replace(datePattern, '').trim();
        
        // Further clean the message by removing sender prefix if present
        multiLineMessage = cleanedMessage.replace(senderPattern, '').trim();
        inMultiLineMode = true;
      } else {
        inMultiLineMode = false;
        multiLineMessage = '';
      }
    } else if (inMultiLineMode && currentDate) {
      // This is a continuation of multi-line message
      multiLineMessage += '\n' + currentLine.trim();
    }
  }
  
  // Process the last message if any
  if (inMultiLineMode && multiLineMessage && currentDate) {
    processMessage(multiLineMessage, currentDate, allLinksWithContext, lines.length, startDate, endDate, groupName, senderForMultiLine);
  }
  
  console.log(`Completed processing file ${fileName}, found ${allLinksWithContext.length} links so far.`);
}

// Helper to check if a date should be skipped based on filters
function shouldSkipDate(messageDate: Date, startDate: Date | null, endDate: Date | null): boolean {
  if (startDate && messageDate < startDate) {
    // Skip messages before the start date
    return true;
  }
  
  if (endDate && messageDate > endDate) {
    // Skip messages after the end date
    return true;
  }
  
  return false;
}

// Process a single message to extract links
function processMessage(
  message: string, 
  messageDate: Date, 
  allLinksWithContext: LinkWithContext[], 
  lineNumber: number, 
  startDate: Date | null, 
  endDate: Date | null,
  groupName?: string,
  sender?: string
): void {
  if (shouldSkipDate(messageDate, startDate, endDate)) {
    return;
  }
  
  // Extract links from the message with context
  const linksWithContext = extractLinksWithContext(message, messageDate, lineNumber);
  
  // Add group name to each link if available
  linksWithContext.forEach(link => {
    link.groupName = groupName;
    link.sender = sender;
    
    // Add debugging logs
    console.log(`>>> DEBUG Storing Link Context: URL: ${link.url.substring(0, 50)}... | FullText: ${link.fullMessageText ? link.fullMessageText.substring(0, 100) : 'MISSING!'}...`);
    
    allLinksWithContext.push(link);
  });
}

// Generate summary based on analyzed content
async function generateSummary(
  links: LinkWithContext[],
  dateRangeInfo: string,
  summaryDateInfo: string
): Promise<string> {
  console.log('Starting summary generation from links');
  
  if (links.length === 0) {
    return 'לא נמצאו לינקים בתקופה המבוקשת';
  }
  
  const summaryStartTime = Date.now();
  
  // Step 1: Preprocess links, limited to the most recent 50 to avoid excessive token usage
  const processedLinks = links.slice(0, 50);
  console.log(`Using ${processedLinks.length} links for summary generation`);
  
  // Step 2: Generate the summary with OpenAI
  // V2 Prompt requesting JSON output
  const prompt = `
    אתה עוזר AI שתפקידך לסכם לינקים מקבוצות וואטסאפ של קהילת יזמי סולו.
    המטרה היא ליצור אובייקט JSON המכיל את המידע על הלינקים, מקובץ לפי קטגוריות.
    
    הנה הלינקים שחולצו ${dateRangeInfo ? dateRangeInfo : ''}:
    ${processedLinks.map(link => {
      // Create a string representation for the prompt
      return JSON.stringify({
        url: link.url,
        messageContext: link.messageContext.replace(link.url, ''), // Avoid redundancy
        date: link.date.toISOString(), // Use ISO string for clarity
        groupName: link.groupName,
        sender: link.sender
      });
    }).join('\n')}
    
    אנא צור אובייקט JSON בלבד, ללא טקסט נוסף לפניו או אחריו.
    ה-JSON צריך להיות מבנה מסוג Record<string, Array>, כאשר:
    - המפתחות (keys) הם שמות הקטגוריות ההגיוניות שמצאת (למשל: "כלי AI", "מאמרים מעניינים", "דיונים", "פיתוח ו-SaaS").
    - הערכים (values) הם מערכים של אובייקטים, כאשר כל אובייקט מייצג לינק ומכיל את השדות הבאים:
        * name: string (שם הכלי/האתר/המאמר)
        * type: string (סוג הלינק: למשל SaaS, כלי AI, סרטון, פוסט לינקדאין, מאמר, GitHub, דיון)
        * description: string (משפט קצר ומדויק המסביר את המטרה)
        * context: string (optional - תקציר קצר של ההודעה שבה הלינק פורסם)
        * keyPoints: string[] (מערך של 2-3 נקודות עיקריות)
        * userValue: string (הסבר על הערך לקהל היעד - יזמים, מפתחים וכו')
        * complexity: string (optional - הערכת זמן/מורכבות)
        * url: string (ה-URL המקורי)
        
    חשוב:
    - נתח את תוכן הלינקים וההקשר שלהם כדי ליצור את הנתונים.
    - קבץ את הלינקים לקטגוריות משמעותיות.
    - ודא שהפלט הוא JSON תקין בלבד.
  `;

  console.log('Making API call to OpenAI requesting JSON');
  console.log(`Prompt length: ${prompt.length} characters`);
  
  try {
    console.log('Attempting OpenAI API call with gpt-4o-mini-2024-07-18');
    const apiCallStartTime = Date.now();
    
    // First try with the faster and more capable gpt-4o-mini
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini-2024-07-18', 
      messages: [
        { role: 'system', content: 'אתה עוזר AI מומחה ביצירת JSON מובנה לפי סכמה מבוקשת. הפלט שלך חייב להיות JSON תקין בלבד.' }, 
        { role: 'user', content: prompt }
      ],
      response_format: { type: "json_object" }, // Enable JSON mode
      temperature: 0.2, // Lowered temperature for consistency
      max_tokens: 3000, // Adjusted tokens slightly, JSON output can be verbose 
    });
    
    const apiCallTime = Date.now() - apiCallStartTime;
    console.log(`OpenAI API call succeeded in ${apiCallTime}ms`);
    console.log(`Response tokens: ${response.usage?.total_tokens || 'unknown'}`);
    
    const totalTime = Date.now() - summaryStartTime;
    console.log(`Total summary generation time: ${totalTime}ms`);
    
    // Step 3: Parse the JSON response
    const jsonContent = response.choices[0].message.content;
    if (!jsonContent) {
      console.error('OpenAI response content is null or empty.');
      throw new Error('קיבלנו תשובה ריקה מ-OpenAI');
    }

    let summaryJson: SummaryJson;
    try {
      summaryJson = JSON.parse(jsonContent) as SummaryJson;
      console.log('Successfully parsed JSON response from OpenAI.');
      // Log the raw JSON object received from the AI
      console.log('>>> Raw JSON received from AI:', JSON.stringify(summaryJson, null, 2)); 
    } catch (parseError) {
      console.error('Failed to parse JSON response from OpenAI:', parseError);
      console.error('Raw OpenAI response content:', jsonContent);
      throw new Error('קיבלנו תשובה לא תקינה (לא JSON) מ-OpenAI');
    }

    // Step 4 & 5: Render JSON to formatted text, passing original links for groupName lookup
    const formattedSummary = renderSummaryFromJson(summaryJson, links, dateRangeInfo, summaryDateInfo);
    return formattedSummary;

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
        const simplifiedPrompt = `סכם את הלינקים הבאים בפורמט הבא בדיוק:

        לילה טוב לכולם. יום פורה עבר עלינו היום בקבוצות השונות
        
        *סיכום לינקים שפורסמו בקבוצות השונות בקהילה*
        ${dateRangeInfo ? dateRangeInfo : `תאריך-${summaryDateInfo}`}
        
        קטגוריות (הצג רק קטגוריות שיש בהן לינקים):
        *כלי AI ופלטפורמות*
        *רשתות חברתיות ונטוורקינג*
        *שיתוף פעולה ותקשורת*
        *משאבי פיתוח והדרכות*
        *עסקים ושיווק*
        *אחר*
        
        מבנה לכל לינק:
        לינק: [URL]
        תיאור: [תיאור קצר]
        ההקשר המלא של ההודעה: [רק אם יש מידע חשוב]
        קבוצה: [שם הקבוצה]
        שולח: [שם השולח]
        נקודות מפתח: [רק אם רלוונטי]
        • [נקודה 1]
        • [נקודה 2]
        • [נקודה 3]
        
        הלינקים:
        ${processedLinks.slice(0, 20).map(link => {
            return `- הלינק: ${link.url}
            - ההודעה המלאה: ${link.fullMessageText || link.messageContext.replace(link.url, '')}
            - תאריך: ${link.date.toLocaleDateString('he-IL')}
            - קבוצה: ${link.groupName || 'לא ידוע'}
            - שולח: ${link.sender || 'לא ידוע'}`;
        }).join('\n\n')}`;
        
        console.log(`Simplified prompt length: ${simplifiedPrompt.length} characters`);
        
        const fallbackResponse = await openai.chat.completions.create({
          model: 'gpt-4o-mini-2024-07-18',
          messages: [
            { role: 'system', content: 'אתה עוזר שמייצר סיכומים מובנים ואחידים לפי פורמט קבוע ומדויק.' },
            { role: 'user', content: simplifiedPrompt }
          ],
          temperature: 0.2,
          max_tokens: 1000,
        });
        
        const fallbackTime = Date.now() - fallbackStartTime;
        console.log(`Fallback OpenAI call completed in ${fallbackTime}ms`);
        
        // Return the simple text directly
        const simpleSummary = fallbackResponse.choices[0].message.content;
        if (!simpleSummary) {
          throw new Error('גם הניסיון הפשוט נכשל, נחזיר רשימת לינקים בסיסית');
        }
        
        return simpleSummary;
      } catch (fallbackError) {
        console.error('Even simplified fallback failed:', fallbackError);
        
        // Last resort: Return a basic list of links
        console.log('Returning basic formatted links as fallback');
        const fallbackText = `לילה טוב לכולם. יום פורה עבר עלינו היום בקבוצות השונות\n\n*סיכום לינקים שפורסמו בקבוצות השונות בקהילה:*\n${dateRangeInfo ? dateRangeInfo : `תאריך-${summaryDateInfo}`}\n\n*לינקים שנמצאו:*\n${processedLinks.slice(0, 10).map(link => {
          let domain = 'Link';
          try {
            // Ensure link.url exists and is a string before creating URL
            if (link?.url && typeof link.url === 'string') {
               const urlObj = new URL(link.url.startsWith('http') ? link.url : `http://${link.url}`);
               domain = urlObj.hostname.replace('www.', '');
            }
          } catch (e) {
            console.warn(`Could not parse domain for URL: ${link?.url}`, e);
          }
          // Use fullMessageText for context, groupName if available
          const context = link.fullMessageText ? link.fullMessageText.substring(0, 100) + (link.fullMessageText.length > 100 ? '...' : '') : 'No context';
          const groupInfo = link.groupName ? `\n  - קבוצה: ${link.groupName}` : '';
          const senderInfo = link.sender ? `\n  - שולח: ${link.sender}` : '';
          return `- *${domain}*\n  - הקשר: ${context}${groupInfo}${senderInfo}\n  - תאריך: ${link.date.toLocaleDateString('he-IL')}\n  - לינק: ${link.url}`;
        }).join('\n\n')}\n\n(הסיכום המפורט נכשל עקב עומס - הצגת לינקים בלבד)`;
        return fallbackText;
      }
    } else {
      throw error; // Re-throw other errors
    }
  }
}

// Helper function to render the formatted summary from the JSON response
function renderSummaryFromJson(
  summaryJson: SummaryJson, 
  originalLinks: LinkWithContext[],
  dateRangeInfo: string, 
  summaryDateInfo: string
): string {
  console.log('Rendering formatted summary from JSON object');
  
  // Start with the standard greeting and header
  let formattedSummary = `לילה טוב לכולם. יום פורה עבר עלינו היום בקבוצות השונות

*סיכום לינקים שפורסמו בקבוצות השונות בקהילה:*
${dateRangeInfo ? dateRangeInfo : `תאריך-${summaryDateInfo}`}

`;
  
  // Helper function to get link original context if needed
  const getLinkOriginalDetails = (url: string): { 
    fullMessageText?: string;
    groupName?: string;
    sender?: string;
  } => {
    // Find the original link to get groupName and full context
    const original = originalLinks.find(link => link.url === url);
    return {
      fullMessageText: original?.fullMessageText,
      groupName: original?.groupName,
      sender: original?.sender
    };
  };
  
  // Process each category
  for (const category in summaryJson) {
    if (summaryJson[category].length === 0) {
      continue; // Skip empty categories
    }
    
    // Add the category header with stars
    formattedSummary += `*${category}*\n\n`;
    
    // Process each link in the category
    for (const link of summaryJson[category]) {
      const originalDetails = getLinkOriginalDetails(link.url);
      
      // Format the link details
      formattedSummary += `- *${link.name}* - ${link.type}\n`;
      formattedSummary += `  - תיאור: ${link.description}\n`;
      
      // Add message context if present (use fullMessageText for better context)
      if (originalDetails.fullMessageText) {
        formattedSummary += `  - הקשר ההודעה: ${originalDetails.fullMessageText.substring(0, 150)}${originalDetails.fullMessageText.length > 150 ? '...' : ''}\n`;
      } else if (link.context) {
        formattedSummary += `  - הקשר ההודעה: ${link.context}\n`;
      }
      
      // Add group name if available
      if (originalDetails.groupName) {
        formattedSummary += `  - קבוצה: ${originalDetails.groupName}\n`;
      }
      
      // Add sender if available
      if (originalDetails.sender) {
        formattedSummary += `  - שולח: ${originalDetails.sender}\n`;
      }
      
      // Add key points if available
      if (link.keyPoints && link.keyPoints.length > 0) {
        formattedSummary += `  - נקודות מפתח:\n`;
        for (const point of link.keyPoints) {
          formattedSummary += `    • ${point}\n`;
        }
      }
      
      // Add user value
      formattedSummary += `  - ערך למשתמש: ${link.userValue}\n`;
      
      // Add complexity if available
      if (link.complexity) {
        formattedSummary += `  - מורכבות/זמן: ${link.complexity}\n`;
      }
      
      // Add the URL
      formattedSummary += `  - לינק: ${link.url}\n\n`;
    }
  }
  
  return formattedSummary.trim();
} 