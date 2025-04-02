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

<<<<<<< HEAD
// Simplified but more inclusive URL pattern that will catch both full URLs and domain-only links
// Updated TLD part to [a-zA-Z]{2,6} to avoid matching numbers like '.0'
const urlPattern = /((?:https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z]{2,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&//=]*))/gi;
=======
// Regex pattern to find links - combines both simple and comprehensive patterns
const urlPattern = /((?:https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&//=]*))/gi;
>>>>>>> 62ad7e5c6c515d3c3995607d1f6ae0457fda6f0f

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
<<<<<<< HEAD
  if (!match) return null;
  
  const dateStr = match[1];
  const timeStr = match[2];
  
  console.log(`Parsing date: ${dateStr}, time: ${timeStr}`);
  
  let day: number, month: number, year: number;
  
  // Check what date format we have
  if (dateStr.includes('-')) {
    // Format: YYYY-MM-DD or DD-MM-YYYY
    const parts = dateStr.split('-');
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);
    } else {
      // DD-MM-YYYY
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      year = parseInt(parts[2], 10);
    }
  } else if (dateStr.includes('.')) {
    // Format: DD.MM.YYYY
    const parts = dateStr.split('.');
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    year = parseInt(parts[2], 10);
  } else {
    // Format: DD/MM/YYYY or MM/DD/YYYY
    const parts = dateStr.split('/');
    
    // Prioritize DD/MM/YYYY format for Israel/European locale
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    year = parseInt(parts[2], 10);

    // Basic validation: if the parsed month is invalid, maybe swap (less likely needed)
    if (month < 1 || month > 12) {
      console.warn(`Potentially ambiguous date ${dateStr}: Parsed month ${month} is invalid. Sticking with DD/MM interpretation.`);
      // Optional: Could add fallback logic here to try MM/DD if DD/MM seems invalid,
      // but sticking to DD/MM is safer given the user's locale.
    } 
  }
  
  // Convert 2-digit year to 4-digit year
  if (year < 100) {
    year = year < 50 ? 2000 + year : 1900 + year;
  }
  
  // Validate the date components
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) {
    console.log(`Invalid date components: day=${day}, month=${month}, year=${year}`);
=======
  if (!match) {
    console.log(`No date pattern match found in line: "${messageLine.substring(0, 50)}..."`);
>>>>>>> 62ad7e5c6c515d3c3995607d1f6ae0457fda6f0f
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
<<<<<<< HEAD
    // Use Date.UTC to treat the parsed components as UTC directly
    const utcTimestamp = Date.UTC(year, month - 1, day, hour, minute, second);
    const parsedDate = new Date(utcTimestamp);
    // Log the parsed date in UTC for consistency
    console.log(`Parsed date (UTC): ${parsedDate.toISOString()}`);
=======
    const parsedDate = new Date(year, month - 1, day, hour, minute, second);
    
    // Validate the parsed date is valid and not in the future
    const now = new Date();
    if (parsedDate > now) {
      console.log(`Parsed date ${parsedDate.toISOString()} is in the future`);
      return null;
    }

    console.log(`Successfully parsed date: ${parsedDate.toISOString()} from line: "${messageLine.substring(0, 50)}..."`);
>>>>>>> 62ad7e5c6c515d3c3995607d1f6ae0457fda6f0f
    return parsedDate;
  } catch (e) {
    console.error('Error creating date object:', e);
    return null;
  }
}

<<<<<<< HEAD
// Utility function to set a date to the start of the day UTC (00:00:00)
function setToStartOfDayUTC(date: Date): Date {
=======
// Helper function to compare dates ignoring time
function isSameOrAfterDate(date: Date, compareToDate: Date): boolean {
  const d1 = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const d2 = new Date(compareToDate.getFullYear(), compareToDate.getMonth(), compareToDate.getDate());
  return d1 >= d2;
}

function isSameOrBeforeDate(date: Date, compareToDate: Date): boolean {
  const d1 = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const d2 = new Date(compareToDate.getFullYear(), compareToDate.getMonth(), compareToDate.getDate());
  return d1 <= d2;
}

// Utility function to set a date to the start of the day (00:00:00)
function setToStartOfDay(date: Date): Date {
>>>>>>> 62ad7e5c6c515d3c3995607d1f6ae0457fda6f0f
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
<<<<<<< HEAD
  groupName?: string;
=======
  fileName?: string;
  sender?: string;
>>>>>>> 62ad7e5c6c515d3c3995607d1f6ae0457fda6f0f
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

<<<<<<< HEAD
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

=======
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

// Helper function to create responses
const createResponse = (data: ResponseData, status = 200) => {
  return NextResponse.json(data, { status });
};

>>>>>>> 62ad7e5c6c515d3c3995607d1f6ae0457fda6f0f
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
    
    if (startDateStr) {
      // Parse the incoming ISO string
      const parsedStartDate = new Date(startDateStr);
      // Extract year, month, day based on the server's local interpretation of the timestamp
      const startYear = parsedStartDate.getFullYear();
      const startMonth = parsedStartDate.getMonth(); // 0-indexed
      const startDay = parsedStartDate.getDate();
      // Construct the start boundary precisely at midnight UTC of that *local* day
      startDate = new Date(Date.UTC(startYear, startMonth, startDay, 0, 0, 0, 0));
      console.log(`Parsed start date boundary (UTC): ${startDate.toISOString()}`);
    }
    
    if (endDateStr) {
      // Parse the incoming ISO string
      const parsedEndDate = new Date(endDateStr);
       // Extract year, month, day based on the server's local interpretation of the timestamp
      const endYear = parsedEndDate.getFullYear();
      const endMonth = parsedEndDate.getMonth(); // 0-indexed
      const endDay = parsedEndDate.getDate();
      // Construct the end boundary precisely at the last millisecond UTC of that *local* day
      endDate = new Date(Date.UTC(endYear, endMonth, endDay, 23, 59, 59, 999));
      console.log(`Parsed end date boundary (UTC)  : ${endDate.toISOString()}`);
    }
    
<<<<<<< HEAD
    // Log the final date range being used for filtering
    console.log(`Filtering with Start Date: ${startDate ? startDate.toISOString() : 'None'}`);
    console.log(`Filtering with End Date  : ${endDate ? endDate.toISOString() : 'None'}`);
    
    // Helper function to create progress responses
    const responseWithProgress = (step: string, data: ResponseData, status = 200) => {
      return NextResponse.json(data, { 
        status,
        headers: {
          'X-Process-Step': step
        }
      });
    };
    
=======
>>>>>>> 62ad7e5c6c515d3c3995607d1f6ae0457fda6f0f
    if (files.length === 0) {
      return createResponse({ message: 'לא התקבלו קבצים' }, 400);
    }
    
    const fileProcessingStartTime = Date.now();
    
    // Step 1-3: Process files and extract links
    // Modified to use array of LinkWithContext instead of string array
    const allLinksWithContext: LinkWithContext[] = [];
    let totalChatFilesFound = 0;
    
    // Step 1: Process zip files
    try {
      for (const file of files) {
        console.log(`Processing file: ${file.name}, size: ${file.size} bytes`);
        
        // Extract group name from the ZIP file name
        let groupName = file.name;
        
        // Remove .zip extension if present
        if (groupName.toLowerCase().endsWith('.zip')) {
          groupName = groupName.slice(0, -4);
        }
        
        // Remove "WhatsApp Chat - " prefix if present
        if (groupName.startsWith('WhatsApp Chat - ')) {
          groupName = groupName.substring('WhatsApp Chat - '.length);
        }
        
        console.log(`Extracted group name from file: "${groupName}"`);
        
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
          
          // NEW: Log ZIP file structure to help diagnose issues
          console.log(`ZIP file structure for ${file.name}:`);
          const fileList = Object.keys(zip.files);
          console.log(`Total files in ZIP: ${fileList.length}`);
          
          // Log the first 10 files to see what's in the archive
          console.log(`First ${Math.min(10, fileList.length)} files in ZIP:`, fileList.slice(0, 10));
          
          // Check if there are any text files that might contain chat data
          const textFiles = fileList.filter(name => name.endsWith('.txt'));
          console.log(`Text files found in ZIP: ${textFiles.length}`, textFiles);
        } catch (zipError) {
          console.error(`Error loading ZIP file ${file.name}:`, zipError);
          throw new Error(`Failed to extract ZIP file ${file.name}: ${zipError instanceof Error ? zipError.message : 'Unknown error'}`);
        }
        
        // Step 2: Filter by date
        // Find and process the chat files (typically _chat.txt)
        let chatFilesFound = 0;
        
        // Log all text files to understand what we're working with
        const allTextFiles = Object.keys(zip.files).filter(name => 
          name.endsWith('.txt') || name.toLowerCase().includes('chat'));
        
        console.log(`All potential text files in ZIP: ${allTextFiles.length}`, allTextFiles);

        // First try with the standard pattern: *_chat.txt
        for (const fileName in zip.files) {
          if (fileName.endsWith('_chat.txt')) {
            const groupName = extractGroupName(fileName); // Extract group name
            console.log(`>>> Extracted Group Name (Standard Loop): '${groupName || 'undefined'}' for file '${fileName}'`); // Log extracted name
            chatFilesFound++;
            console.log(`Processing chat file (standard format): ${fileName}, Group: ${groupName || 'Unknown'}`);
            
            let chatFileContent;
            try {
              chatFileContent = await zip.files[fileName].async('string');
              console.log(`Chat file ${fileName} extracted, size: ${chatFileContent.length} chars`);
            } catch (extractError) {
              console.error(`Error extracting chat file ${fileName}:`, extractError);
              continue; // Skip this file but continue with others
            }
            
            // Split by lines and process each line
            const lines: string[] = chatFileContent.split('\n');
            console.log(`Total lines in chat file ${fileName}: ${lines.length}`);
            
            let currentDate: Date | null = null;
            let currentLine = '';
            let messagesInRange = 0;
            let messagesWithLinks = 0;
            
            // Step 3: Extract links
            for (let i = 0; i < lines.length; i++) {
              const line: string = lines[i];
              // Log the raw line being processed for debugging
              // console.log(`[Line ${i+1}] Processing: ${line.substring(0, 100)}`); 
              
              // Check if line starts with a date
              const dateMatch = line.match(datePattern);
              
              if (dateMatch) {
                // Process previous message if it exists and contains links
                if (currentLine && currentDate) {
                  // Check if the message is within the date range
                  const isAfterStart = !startDate || isSameOrAfterDate(currentDate, startDate);
                  const isBeforeEnd = !endDate || isSameOrBeforeDate(currentDate, endDate);
                  const isInRange = isAfterStart && isBeforeEnd;

                  console.log(`Detailed date range check for message:`, {
                    messageDate: currentDate.toISOString(),
                    startDate: startDate?.toISOString(),
                    endDate: endDate?.toISOString(),
                    isAfterStart,
                    isBeforeEnd,
                    isInRange,
                    messagePreview: currentLine.substring(0, 100)
                  });

                  if (isInRange && currentDate instanceof Date) {
                    messagesInRange++;
                    console.log(`  -> Previous message in range (Date: ${currentDate.toISOString()}). Extracting links.`);
                    
                    // Extract links from the complete message
                    // Clean timestamp from the *full* currentLine before passing
                    const cleanedFullMessage = currentLine.replace(/^\s*\[\d{1,2}\/\d{1,2}\/\d{2,4}, \d{1,2}:\d{1,2}(?::\d{1,2})?\]\s*/, '');
                    const extractedLinks = extractLinksWithContext(cleanedFullMessage, currentDate, i);
                    
                    if (extractedLinks.length > 0) {
                      messagesWithLinks++;
<<<<<<< HEAD
                      // Add groupName to each extracted link
                      extractedLinks.forEach(link => {
                        link.groupName = groupName;
                        console.log(`>>> DEBUG Storing Link Context (std-prev): URL=${link.url}, FullText="${link.fullMessageText?.substring(0,100)}..."`); // Log stored context
                      });
                      allLinksWithContext.push(...extractedLinks);
                    }
                  } else if (currentDate instanceof Date) {
                    console.log(`  -> Previous message OUT of range (Date: ${currentDate.toISOString()}).`);
=======
                      console.log(`Found ${extractedLinks.length} links in message within date range:`, {
                        messageDate: currentDate.toISOString(),
                        startDate: startDate?.toISOString(),
                        endDate: endDate?.toISOString(),
                        isAfterStart,
                        isBeforeEnd,
                        links: extractedLinks.map(l => l.url)
                      });
                      
                      // Extract sender name from the message
                      let sender = extractSender(currentLine);
                      
                      // Update where links are added to include sender information
                      if (currentDate instanceof Date && (!startDate || currentDate >= startDate) && (!endDate || currentDate <= endDate)) {
                        const validDate: Date = currentDate;
                        allLinksWithContext.push(...extractedLinks.map(link => ({
                          url: link.url,
                          messageContext: currentLine,
                          date: validDate,
                          fileName: groupName,
                          sender: sender
                        })));
                      } else {
                        console.log(`Skipping message - failed secondary date range check:`, {
                          messageDate: currentDate?.toISOString(),
                          startDate: startDate?.toISOString(),
                          endDate: endDate?.toISOString()
                        });
                      }
                    }
                  } else {
                    console.log(`Message excluded due to date range:`, {
                      messageDate: currentDate.toISOString(),
                      startDate: startDate?.toISOString(),
                      endDate: endDate?.toISOString(),
                      isAfterStart,
                      isBeforeEnd,
                      messagePreview: currentLine.substring(0, 100)
                    });
>>>>>>> 62ad7e5c6c515d3c3995607d1f6ae0457fda6f0f
                  }
                }
                
                // Extract the new date and start a new message
                currentDate = extractDateFromMessage(line);
                console.log(`  -> Parsed date from line: ${currentDate ? currentDate.toISOString() : 'null'}`);
                currentLine = line;
                
                // Also check the current line for links (in case they're in the same line as the date)
                if (currentDate instanceof Date) {
<<<<<<< HEAD
                  const isInRange = (!startDate || currentDate >= startDate) && 
                                    (!endDate || currentDate <= endDate);
                  console.log(`  -> Checking date line: Date=${currentDate.toISOString()}, Start=${startDate?.toISOString()}, End=${endDate?.toISOString()}, InRange=${isInRange}`);
                                      
                  if (isInRange) {
                    console.log(`     -> Date line IN range. Extracting links.`);
                    // Clean timestamp from the *current line* before passing
                    const cleanedDateLine = line.replace(/^\s*\[\d{1,2}\/\d{1,2}\/\d{2,4}, \d{1,2}:\d{1,2}(?::\d{1,2})?\]\s*/, '');
                    const dateLineLinks = extractLinksWithContext(cleanedDateLine, currentDate, i);
                    if (dateLineLinks.length > 0) {
                      // Add groupName to each extracted link
                      dateLineLinks.forEach(link => {
                        link.groupName = groupName;
                        console.log(`>>> DEBUG Storing Link Context (std-curr): URL=${link.url}, FullText="${link.fullMessageText?.substring(0,100)}..."`); // Log stored context
                      });
                      allLinksWithContext.push(...dateLineLinks);
                    }
                  } else if (currentDate instanceof Date) {
                    console.log(`  -> Previous message OUT of range (Date: ${currentDate.toISOString()}).`);
=======
                  // Apply date filtering here too
                  const isAfterStart = !startDate || isSameOrAfterDate(currentDate, startDate);
                  const isBeforeEnd = !endDate || isSameOrBeforeDate(currentDate, endDate);
                  const isInRange = isAfterStart && isBeforeEnd;
                  
                  if (isInRange) {
                    const dateLineLinks = extractLinksWithContext(line, currentDate, i);
                    if (dateLineLinks.length > 0) {
                      console.log(`Found ${dateLineLinks.length} links in date line within range:`, {
                        messageDate: currentDate.toISOString(),
                        startDate: startDate?.toISOString(),
                        endDate: endDate?.toISOString(),
                        links: dateLineLinks.map(l => l.url)
                      });
                      
                      // Extract sender name from the message
                      let sender = extractSender(line);
                      
                      const validDate: Date = currentDate;
                      allLinksWithContext.push(...dateLineLinks.map(link => ({
                        url: link.url,
                        messageContext: line,
                        date: validDate,
                        fileName: groupName,
                        sender: sender
                      })));
                    }
                  } else {
                    console.log(`Skipping date line - outside date range:`, {
                      messageDate: currentDate.toISOString(),
                      startDate: startDate?.toISOString(),
                      endDate: endDate?.toISOString(),
                      messagePreview: line.substring(0, 100)
                    });
>>>>>>> 62ad7e5c6c515d3c3995607d1f6ae0457fda6f0f
                  }
                }
              } else {
                // Continue current message
                if (currentLine) {
                  // Preserve line breaks and clean up extra spaces
                  currentLine += (line.trim() ? '\n' + line.trim() : '');
                  // Clean up any duplicate newlines or spaces
                  currentLine = currentLine.replace(/\n\s*\n/g, '\n').trim();
                } else {
                  currentLine = line;
                }
              }
            }
            
            // Process the last line if necessary
            if (currentLine && currentDate) {
              const isAfterStart = !startDate || isSameOrAfterDate(currentDate, startDate);
              const isBeforeEnd = !endDate || isSameOrBeforeDate(currentDate, endDate);
              const isInRange = isAfterStart && isBeforeEnd;

              console.log(`Detailed date range check for message:`, {
                messageDate: currentDate.toISOString(),
                startDate: startDate?.toISOString(),
                endDate: endDate?.toISOString(),
                isAfterStart,
                isBeforeEnd,
                isInRange,
                messagePreview: currentLine.substring(0, 100)
              });

              if (isInRange && currentDate instanceof Date) {
                messagesInRange++;
                
                // Extract links from the complete message
                // Clean timestamp from the *full* currentLine before passing
                const cleanedLastLine = currentLine.replace(/^\s*\[\d{1,2}\/\d{1,2}\/\d{2,4}, \d{1,2}:\d{1,2}(?::\d{1,2})?\]\s*/, '');
                const extractedLinks = extractLinksWithContext(cleanedLastLine, currentDate, lines.length);
                
                if (extractedLinks.length > 0) {
                  messagesWithLinks++;
<<<<<<< HEAD
                  // Add groupName to each extracted link
                  extractedLinks.forEach(link => {
                    link.groupName = groupName;
                    console.log(`>>> DEBUG Storing Link Context (std-last): URL=${link.url}, FullText="${link.fullMessageText?.substring(0,100)}..."`); // Log stored context
                  });
                  allLinksWithContext.push(...extractedLinks);
=======
                  console.log(`Found ${extractedLinks.length} links in message within date range:`, {
                    messageDate: currentDate.toISOString(),
                    startDate: startDate?.toISOString(),
                    endDate: endDate?.toISOString(),
                    isAfterStart,
                    isBeforeEnd,
                    links: extractedLinks.map(l => l.url)
                  });
                  
                  // Extract sender name from the message
                  let sender = extractSender(currentLine);
                  
                  // Update where links are added to include sender information
                  if (currentDate instanceof Date && (!startDate || currentDate >= startDate) && (!endDate || currentDate <= endDate)) {
                    const validDate: Date = currentDate;
                    allLinksWithContext.push(...extractedLinks.map(link => ({
                      url: link.url,
                      messageContext: currentLine,
                      date: validDate,
                      fileName: groupName,
                      sender: sender
                    })));
                  } else {
                    console.log(`Skipping message - failed secondary date range check:`, {
                      messageDate: currentDate?.toISOString(),
                      startDate: startDate?.toISOString(),
                      endDate: endDate?.toISOString()
                    });
                  }
>>>>>>> 62ad7e5c6c515d3c3995607d1f6ae0457fda6f0f
                }
              } else {
                console.log(`Message excluded due to date range:`, {
                  messageDate: currentDate.toISOString(),
                  startDate: startDate?.toISOString(),
                  endDate: endDate?.toISOString(),
                  isAfterStart,
                  isBeforeEnd,
                  messagePreview: currentLine.substring(0, 100)
                });
              }
            }
            
            console.log(`File ${fileName} stats: messages in range: ${messagesInRange}, messages with links: ${messagesWithLinks}`);
          }
        }

        // If no standard files found, try with a more flexible approach
        if (chatFilesFound === 0) {
          console.log('No standard chat files found, trying alternative formats');
          
          // Try with other common WhatsApp export patterns
          for (const fileName in zip.files) {
            // Check for any text file that might be a chat export
            if ((fileName.endsWith('.txt') && 
                (fileName.toLowerCase().includes('whatsapp') || 
                 fileName.toLowerCase().includes('chat') || 
                 fileName.toLowerCase().includes('צאט'))) || // Hebrew word for chat
                (fileName.includes('.txt'))) {
              
              // Let's check the content to see if it looks like a WhatsApp chat
              try {
                const content = await zip.files[fileName].async('string');
                const lines = content.split('\n').slice(0, 10); // Look at first 10 lines
                
                // Check if at least one line matches the WhatsApp date format
                const hasWhatsAppFormat = lines.some(line => {
                  const matches = line.match(datePattern);
                  if (matches) {
                    console.log(`Found date format match in line: "${line.substring(0, 50)}..."`);
                    console.log(`Date parts: "${matches[1]}" and time: "${matches[2]}"`);
                    return true;
                  }
                  return false;
                });
                
                if (hasWhatsAppFormat) {
                  const groupName = extractGroupName(fileName); // Extract group name
                  console.log(`>>> Extracted Group Name (Alternative Loop): '${groupName || 'undefined'}' for file '${fileName}'`); // Log extracted name
                  chatFilesFound++;
                  console.log(`Processing chat file (alternative format): ${fileName}, Group: ${groupName || 'Unknown'}`);
                  
                  // Split by lines and process each line
                  const allLines = content.split('\n');
                  console.log(`Total lines in chat file ${fileName}: ${allLines.length}`);
                  
                  let currentDate: Date | null = null;
                  let currentLine = '';
                  let messagesInRange = 0;
                  let messagesWithLinks = 0;
                  
                  // Step 3: Extract links
                  for (let i = 0; i < allLines.length; i++) {
                    const line: string = allLines[i];
                    
                    // Check if line starts with a date
                    const dateMatch = line.match(datePattern);
                    
                    if (dateMatch) {
                      // Sample log for first few matches to debug date parsing
                      if (i < 5 || i % 1000 === 0) {
                        console.log(`Found message at line ${i}: "${line.substring(0, 50)}..."`);
                      }
                      // Process previous line if it exists and contains links
                      if (currentLine && currentDate) {
                        // Check if the message is within the date range
                        const isAfterStart = !startDate || currentDate >= startDate;
                        const isBeforeEnd = !endDate || currentDate <= endDate;
                        const isInRange = isAfterStart && isBeforeEnd;
                        
                        if (isInRange && currentDate instanceof Date) {
                          messagesInRange++;
                          
                          // Extract links from the complete message
                          // Clean timestamp from the *full* currentLine before passing
                          const cleanedFullMessageAlt = line.replace(/^\s*\[\d{1,2}\/\d{1,2}\/\d{2,4}, \d{1,2}:\d{1,2}(?::\d{1,2})?\]\s*/, '');
                          const extractedLinks = extractLinksWithContext(cleanedFullMessageAlt, currentDate, i);
                          
                          if (extractedLinks.length > 0) {
                            messagesWithLinks++;
<<<<<<< HEAD
                            // Add groupName to each extracted link
                            extractedLinks.forEach(link => {
                              link.groupName = groupName;
                              console.log(`>>> DEBUG Storing Link Context (alt-prev): URL=${link.url}, FullText="${link.fullMessageText?.substring(0,100)}..."`); // Log stored context
                            });
                            allLinksWithContext.push(...extractedLinks);
=======
                            
                            // Extract sender name from the message
                            let sender = extractSender(currentLine);
                            
                            // Double check date range before adding links
                            if (currentDate instanceof Date && (!startDate || currentDate >= startDate) && (!endDate || currentDate <= endDate)) {
                              const validDate: Date = currentDate; // Type assertion to ensure Date type
                              allLinksWithContext.push(...extractedLinks.map(link => ({
                                url: link.url,
                                messageContext: currentLine,
                                date: validDate,
                                fileName: groupName,
                                sender: sender
                              })));
                            } else {
                              console.log('Skipping message - invalid date:', currentDate);
                            }
>>>>>>> 62ad7e5c6c515d3c3995607d1f6ae0457fda6f0f
                          }
                        }
                      }
                      
                      // Extract the new date and start a new message
                      currentDate = extractDateFromMessage(line);
                      currentLine = line;
                    } else {
                      // Continue current message
                      if (currentLine) {
                        // Preserve line breaks and clean up extra spaces
                        currentLine += (line.trim() ? '\n' + line.trim() : '');
                        // Clean up any duplicate newlines or spaces
                        currentLine = currentLine.replace(/\n\s*\n/g, '\n').trim();
                      } else {
                        currentLine = line;
                      }
                    }
                  }
                  
                  // Process the last line if necessary
                  if (currentLine && currentDate) {
                    const isInRange = (!startDate || currentDate >= startDate) && 
                                      (!endDate || currentDate <= endDate);
                    
                    if (isInRange && currentDate instanceof Date) {
                      messagesInRange++;
                      
                      // Extract links from the complete message
                      // Clean timestamp from the *full* currentLine before passing
                      const cleanedLastLine = currentLine.replace(/^\s*\[\d{1,2}\/\d{1,2}\/\d{2,4}, \d{1,2}:\d{1,2}(?::\d{1,2})?\]\s*/, '');
                      const extractedLinks = extractLinksWithContext(cleanedLastLine, currentDate, allLines.length);
                      
                      if (extractedLinks.length > 0) {
                        messagesWithLinks++;
<<<<<<< HEAD
                        // Add groupName to each extracted link
                        extractedLinks.forEach(link => {
                          link.groupName = groupName;
                          console.log(`>>> DEBUG Storing Link Context (alt-last): URL=${link.url}, FullText="${link.fullMessageText?.substring(0,100)}..."`); // Log stored context
                        });
                        allLinksWithContext.push(...extractedLinks);
=======
                        
                        // Extract sender name from the message
                        let sender = extractSender(currentLine);
                        
                        // Ensure we have a valid date before adding links
                        if (currentDate instanceof Date) {
                          const validDate: Date = currentDate; // Type assertion to ensure Date type
                          allLinksWithContext.push(...extractedLinks.map(link => ({
                            url: link.url,
                            messageContext: currentLine,
                            date: validDate,
                            fileName: groupName,
                            sender: sender
                          })));
                        } else {
                          console.log('Skipping message - invalid date:', currentDate);
                        }
>>>>>>> 62ad7e5c6c515d3c3995607d1f6ae0457fda6f0f
                      }
                    }
                  }
                  
                  console.log(`File ${fileName} stats: messages in range: ${messagesInRange}, messages with links: ${messagesWithLinks}`);
                } else {
                  console.log(`File ${fileName} doesn't appear to be a WhatsApp chat (no date patterns found)`);
                }
              } catch (e) {
                console.error(`Error reading file ${fileName}:`, e);
              }
            }
          }
        }
        
        if (chatFilesFound === 0) {
          console.log(`No chat files found in ZIP file ${file.name}`);
          
          // NEW: Enhanced error logging to help diagnose the issue
          console.log(`WARNING: No WhatsApp chat files found in ZIP file ${file.name}`);
          console.log(`Expected file pattern: *_chat.txt or other WhatsApp export formats`);
          
          // Try to find any TXT files and log their names to help identify the format
          const allTextFiles = Object.keys(zip.files).filter(name => 
            name.endsWith('.txt') || name.toLowerCase().includes('chat'));
          
          if (allTextFiles.length > 0) {
            console.log(`Found ${allTextFiles.length} potential text files that might contain chat data:`, allTextFiles);
            
            // NEW: For the first text file found, check content format
            try {
              const firstTextFile = allTextFiles[0];
              const content = await zip.files[firstTextFile].async('string');
              const lines = content.split('\n');
              const firstFewLines = lines.slice(0, 5).join('\n');
              
              console.log(`First few lines of ${firstTextFile} to help diagnose format:`);
              console.log(firstFewLines);
              
              // Check if the first line matches the expected date format
              const hasDateFormat = datePattern.test(lines[0]);
              console.log(`First line contains WhatsApp date format? ${hasDateFormat}`);
              
              if (!hasDateFormat) {
                console.log(`HINT: Expected date format example: [25/03/2024, 14:30:45]`);
              }
            } catch (e) {
              console.error(`Could not read content of potential text file:`, e);
            }
          } else {
            console.log(`No text files or chat-related files found in the ZIP. This may not be a WhatsApp export ZIP.`);
            console.log(`HINT: WhatsApp export ZIPs should contain a file named '[chat name]_chat.txt'`);
          }
        } else {
          // If chat files were found, add to the total count
          totalChatFilesFound += chatFilesFound;
        }
      }
    } catch (error) {
      console.error('Error processing files:', error);
      return createResponse({ 
        message: 'שגיאה בעיבוד הקבצים',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error 
      }, 500);
    }
    
    const fileProcessingTime = logTime('File processing', fileProcessingStartTime);
    console.log(`File processing completed in ${fileProcessingTime}ms`);
    
    // Remove duplicates based on URL, keeping the first occurrence's context
    const uniqueLinksByURL: LinkWithContext[] = [];
    const seenUrls = new Set<string>();
    
    for (const link of allLinksWithContext) {
      if (!seenUrls.has(link.url)) {
        seenUrls.add(link.url);
        uniqueLinksByURL.push(link);
      }
    }
    
    console.log(`Found ${uniqueLinksByURL.length} unique links (by URL) from ${allLinksWithContext.length} total links found`);
    
    if (uniqueLinksByURL.length === 0) {
      // NEW: Enhanced user-friendly error message with more details
      const errorMessage = startDate || endDate 
          ? 'לא נמצאו לינקים בטווח התאריכים שנבחר' 
          : 'לא נמצאו לינקים בקבצים';
      
      console.log(`No links found. Error details:`);
      console.log(`- Files processed: ${files.length}`);
      console.log(`- Chat files found: ${totalChatFilesFound}`);
      console.log(`- Date range: ${startDate?.toISOString()} to ${endDate?.toISOString()}`);
      console.log(`- Error message to user: ${errorMessage}`);
      
      return createResponse({ 
        message: errorMessage,
        details: {
          filesProcessed: files.length,
          chatFilesFound: totalChatFilesFound,
          dateRange: {
            start: startDate?.toISOString(),
            end: endDate?.toISOString()
          }
        }
      }, 404);
    }

    // Strictly limit links to ensure processing completes within timeout
    const MAX_LINKS = 30; // Further reduced limit for higher reliability
    const linksToProcess = uniqueLinksByURL.length > MAX_LINKS 
      ? uniqueLinksByURL.slice(0, MAX_LINKS) 
      : uniqueLinksByURL;
    
    if (uniqueLinksByURL.length > MAX_LINKS) {
      console.log(`Limiting links from ${uniqueLinksByURL.length} to ${MAX_LINKS} to prevent timeout`);
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
        return createResponse({ 
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
      
      return createResponse({ summary });
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
      
      return createResponse(errorDetails, 500);
    }
  } catch (error) {
    console.error('Error in POST handler:', error);
    const totalTime = logTime('Total execution time (error)', startTime);
    
    return createResponse(
      { 
        message: 'אירעה שגיאה בעיבוד הקבצים',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: {
          error,
          totalTimeMs: totalTime
        }
      },
      500
    );
  }
}

// --- JSON Mode Rendering Function ---

function renderSummaryFromJson(
  summaryJson: SummaryJson, 
  originalLinks: LinkWithContext[], // Accept the original links
  dateRangeInfo: string, 
  summaryDateInfo: string
): string {
  let output = "לילה טוב לכולם. יום פורה עבר עלינו היום בקבוצות השונות\n\n";
  output += "*סיכום לינקים שפורסמו בקבוצות השונות בקהילה:*\n";
  output += `${dateRangeInfo ? dateRangeInfo : `תאריך הסיכום: תאריך-${summaryDateInfo}`}\n\n`;

  // Create a map for quick lookup of original link data by URL
  const originalLinkMap = new Map<string, LinkWithContext>();
  originalLinks.forEach(link => {
    if (!originalLinkMap.has(link.url)) { // Keep the first encountered context if duplicates exist
      originalLinkMap.set(link.url, link);
    }
  });

  // Loop through categories in the JSON object
  for (const category in summaryJson) {
    if (Object.prototype.hasOwnProperty.call(summaryJson, category)) {
      output += `*${category.trim()}*\n`; // Category name (bold)
      const linksInCategory = summaryJson[category];

      // Loop through links within the category (as generated by AI)
      for (const summarizedLink of linksInCategory) {
        // Find the original link data using the URL as the key
        const originalLink = originalLinkMap.get(summarizedLink.url);
        const groupName = originalLink?.groupName; // Get groupName from original data

        output += `  - *${summarizedLink.name || 'שם לא ידוע'}* - [${summarizedLink.type || 'סוג לא ידוע'}]\n`; // Name (bold) - [Type]
        output += `    - תיאור: ${summarizedLink.description || 'אין תיאור'}\n`;
        // Use the full message text directly from the original link data
        const contextToDisplay = originalLink?.fullMessageText; 
        if (contextToDisplay) {
          // Timestamp is already removed from fullMessageText
          output += `    - הקשר ההודעה: ${contextToDisplay}\n`;
        }
        // Use the groupName retrieved from the original link data
        if (groupName) {
          output += `    - קבוצה: ${groupName}\n`;
        }
        if (summarizedLink.keyPoints && summarizedLink.keyPoints.length > 0) {
          output += `    - נקודות מפתח:\n`;
          summarizedLink.keyPoints.forEach(point => {
            output += `      • ${point}\n`;
          });
        }
        output += `    - ערך למשתמש: ${summarizedLink.userValue || 'ערך לא צוין'}\n`;
        if (summarizedLink.complexity) {
          output += `    - זמן/מורכבות: ${summarizedLink.complexity}\n`;
        }
        output += `    - לינק: ${summarizedLink.url}\n\n`; // Add extra newline for spacing
      }
    }
  }

  return output.trim(); // Remove trailing whitespace
}

// --- End JSON Mode Rendering Function ---

async function generateSummary(
  links: LinkWithContext[], 
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

  // Increase MAX_CHARS to allow for more links while staying within API limits
  const MAX_CHARS = 12000; // Increased from previous value

  // More efficient character counting
  const getMessageSize = (link: LinkWithContext) => {
    // Calculate approximate size of the message in the prompt
    return (
      link.url.length +
      Math.min(link.messageContext.length, 300) + // Limit context length
      50 // Buffer for formatting
    );
  };

  // Process links more efficiently
  const processedLinks = links.reduce((acc: LinkWithContext[], link) => {
    const newSize = acc.reduce((sum, l) => sum + getMessageSize(l), 0) + getMessageSize(link);
    if (newSize <= MAX_CHARS) {
      acc.push(link);
    }
    return acc;
  }, []);

  console.log(`Using ${processedLinks.length} links in prompt (estimated ${processedLinks.reduce((sum, l) => sum + getMessageSize(l), 0)} chars)`);
  
  // V2 Prompt requesting JSON output
  const prompt = `
    אתה עוזר AI שתפקידך לסכם לינקים מקבוצות וואטסאפ של קהילת יזמי סולו.
    המטרה היא ליצור אובייקט JSON המכיל את המידע על הלינקים, מקובץ לפי קטגוריות.
    
    הנה הלינקים שחולצו ${dateRangeInfo ? dateRangeInfo : ''}:
    ${processedLinks.map(link => {
<<<<<<< HEAD
      // Create a string representation for the prompt
      return JSON.stringify({
        url: link.url,
        messageContext: link.messageContext.replace(link.url, ''), // Avoid redundancy
        date: link.date.toISOString(), // Use ISO string for clarity
        groupName: link.groupName
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
=======
      // Clean message context by removing date/time and sender info
      const cleanedContext = link.messageContext.replace(/^\[.*?\]\s*~?\s*[^:]+:\s*/m, '');
      return `- הלינק: ${link.url}
      - ההודעה המלאה: ${cleanedContext}
      - קבוצה: ${link.fileName || 'לא ידוע'}
      - שולח: ${link.sender || 'לא ידוע'}
      - תאריך: ${link.date.toLocaleDateString('he-IL')}
      - שעה: ${link.date.toLocaleTimeString('he-IL')}`;
    }).join('\n\n')}
    
    סכם את הלינקים הללו באופן מובנה ועקבי עם המבנה המדויק הבא:

    "לילה טוב לכולם. יום פורה עבר עלינו היום בקבוצות השונות
    
    *סיכום לינקים שפורסמו בקבוצות השונות בקהילה*
    ${dateRangeInfo ? dateRangeInfo : `תאריך-${summaryDateInfo}`}

    סדר את הלינקים לפי הקטגוריות הבאות בדיוק, והצג רק קטגוריות שיש בהן לינקים:
    1. *כלי AI ופלטפורמות*
    2. *רשתות חברתיות ונטוורקינג*
    3. *שיתוף פעולה ותקשורת*
    4. *משאבי פיתוח והדרכות*
    5. *עסקים ושיווק*
    6. *אחר*

    עבור כל לינק, השתמש במבנה הבא בדיוק, בסדר הזה:

    לינק: [URL]
    תיאור: [תיאור קצר של הלינק בעברית]
    ההקשר המלא של ההודעה: [הצג רק אם יש הקשר חשוב מעבר ללינק עצמו]
    קבוצה: [שם הקבוצה]
    שולח: [שם השולח]
    נקודות מפתח: [הצג רק אם רלוונטי, עד 3 נקודות]
    • [נקודה 1]
    • [נקודה 2]
    • [נקודה 3]

    כללים חשובים:
    1. הצג תמיד את שם הקטגוריה עם כוכבית לפני ואחרי (*כלי AI ופלטפורמות*)
    2. השאר רווח של שורה אחת בין כל לינק
    3. הצג את ההקשר המלא של ההודעה רק אם יש בו מידע מהותי מעבר ללינק עצמו
    4. הצג נקודות מפתח רק כאשר יש מידע רלוונטי ומשמעותי
    5. אל תוסיף תכנים שאינם מופיעים בפורמט שהוגדר
    6. אל תוסיף כל טקסט או סיכום בסוף המסמך
    7. המסמך צריך להסתיים עם הלינק האחרון, ללא כל תוכן נוסף

    הקפד לשמור על מבנה אחיד וקבוע לחלוטין עבור כל הלינקים, בכל פעם שהסיכום נוצר."
>>>>>>> 62ad7e5c6c515d3c3995607d1f6ae0457fda6f0f
  `;

  console.log('Making API call to OpenAI requesting JSON');
  console.log(`Prompt length: ${prompt.length} characters`);
  
  try {
<<<<<<< HEAD
    console.log('Attempting OpenAI API call with gpt-4o-mini');
    const apiCallStartTime = Date.now();
    
    // First try with the faster and more capable gpt-4o-mini
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Changed from gpt-3.5-turbo
      messages: [
        { role: 'system', content: 'אתה עוזר AI מומחה ביצירת JSON מובנה לפי סכמה מבוקשת. הפלט שלך חייב להיות JSON תקין בלבד.' }, // Updated system message
        { role: 'user', content: prompt }
      ],
      response_format: { type: "json_object" }, // Enable JSON mode
      temperature: 0.2, // Lowered temperature for consistency
      max_tokens: 3000, // Adjusted tokens slightly, JSON output can be verbose 
=======
    console.log('Attempting OpenAI API call with gpt-4o-mini-2024-07-18');
    const apiCallStartTime = Date.now();
    
    // First try with GPT-4 for speed
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini-2024-07-18',
      messages: [
        { role: 'system', content: 'אתה עוזר שמייצר סיכומים מובנים ואחידים לפי פורמט קבוע ומדויק. התוצר שלך זהה בכל פעם מבחינת המבנה.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 2000,
>>>>>>> 62ad7e5c6c515d3c3995607d1f6ae0457fda6f0f
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
            // Clean message context by removing date/time and sender info
            const cleanedContext = link.messageContext.replace(/^\[.*?\]\s*~?\s*[^:]+:\s*/m, '');
            return `- הלינק: ${link.url}
<<<<<<< HEAD
            - ההודעה המלאה: ${link.messageContext.replace(link.url, '')}
            - תאריך: ${link.date.toLocaleDateString('he-IL')}${link.groupName ? `\n            - קבוצה: ${link.groupName}` : ''}`;
          }).join('\n\n')}
          
          התחל את הסיכום עם: "לילה טוב לכולם. יום פורה עבר עלינו היום בקבוצות השונות"
          בשורה השנייה, הוסף: "*סיכום לינקים שפורסמו בקבוצות השונות בקהילה:*"
          בשורה השלישית, הוסף: ${dateRangeInfo ? `"${dateRangeInfo}"` : `"תאריך-${summaryDateInfo}"`}
          
          חלק את הלינקים לקטגוריות הגיוניות.
          
          עבור כל לינק, הצג במבנה הבא:
          - *שם הכלי/האתר* - [סוג הלינק]
          - תיאור: משפט קצר על מטרת הלינק
          - הקשר ההודעה: תקציר של ההודעה בה פורסם הלינק (אם יש)
          - קבוצה: שם הקבוצה (אם ידוע)
          - נקודות מפתח:
            • תכונה/תובנה עיקרית אחת
          - ערך למשתמש: למי ומתי הלינק שימושי
          - לינק: [URL]
          
          הקפד על מבנה אחיד, תמציתי וברור בעברית.
        `;
=======
            - ההודעה המלאה: ${cleanedContext}
            - קבוצה: ${link.fileName || 'לא ידוע'}
            - שולח: ${link.sender || 'לא ידוע'}
            - תאריך: ${link.date.toLocaleDateString('he-IL')}`;
        }).join('\n\n')}`;
>>>>>>> 62ad7e5c6c515d3c3995607d1f6ae0457fda6f0f
        
        console.log(`Simplified prompt length: ${simplifiedPrompt.length} characters`);
        
        const fallbackResponse = await openai.chat.completions.create({
<<<<<<< HEAD
          model: 'gpt-4o-mini', // Changed from gpt-3.5-turbo
          messages: [
            { role: 'system', content: 'תן תשובה קצרה ועקבית במבנה המבוקש בעברית.' }, // System message adjusted
            { role: 'user', content: simplifiedPrompt }
          ],
          temperature: 0.2, // Lowered temperature for consistency
=======
          model: 'gpt-4o-mini-2024-07-18',
          messages: [
            { role: 'system', content: 'אתה עוזר שמייצר סיכומים מובנים ואחידים לפי פורמט קבוע ומדויק.' },
            { role: 'user', content: simplifiedPrompt }
          ],
          temperature: 0.2,
>>>>>>> 62ad7e5c6c515d3c3995607d1f6ae0457fda6f0f
          max_tokens: 1000,
        });
        
        const fallbackTime = Date.now() - fallbackStartTime;
        console.log(`Fallback API call succeeded in ${fallbackTime}ms`);
        
        return fallbackResponse.choices[0].message.content || 'לא הצלחתי לייצר סיכום';
      } catch (fallbackError) {
        console.error('Even fallback approach failed:', fallbackError);
        
        // If even the simplified approach fails, return a basic message
        console.log('Returning basic formatted links as fallback');
        return `לילה טוב לכולם. יום פורה עבר עלינו היום בקבוצות השונות

*סיכום לינקים שפורסמו בקבוצות השונות בקהילה*
${dateRangeInfo ? dateRangeInfo : `תאריך-${summaryDateInfo}`}

*אחר*
${processedLinks.slice(0, 10).map(link => {
  return `לינק: ${link.url}
תיאור: לינק מקבוצת הוואטסאפ
קבוצה: ${link.fileName || 'לא ידוע'}
שולח: ${link.sender || 'לא ידוע'}`;
}).join('\n\n')}`;
      }
    }
    
    // Re-throw the error with more context
    throw new Error(`OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 