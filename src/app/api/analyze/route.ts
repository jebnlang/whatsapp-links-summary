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

// Simplified but more inclusive URL pattern that will catch both full URLs and domain-only links
// Updated TLD part to [a-zA-Z]{2,6} to avoid matching numbers like '.0'
const urlPattern = /((?:https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z]{2,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&//=]*))/gi;

// Updated regex pattern to match multiple WhatsApp date formats
// Supports formats like:
// [31/12/2023, 23:45:67]
// [12/31/23, 11:45 PM]
// [2023-12-31, 23:45:67]
// [31.12.2023, 23:45]
// And now also formats without brackets:
// 22.9.2024, 14:33 - ...
// 10.9.2024, 12:17 - ...
const datePattern = /(?:\[)?(\d{1,4}[\.\/\-]\d{1,2}[\.\/\-]\d{1,4}),\s*(\d{1,2}:\d{1,2}(?::\d{1,2})?\s*(?:AM|PM)?)(?:\])?(?:\s*-)?/i;

// Extracts date from a WhatsApp message line with improved parsing
function extractDateFromMessage(messageLine: string): Date | null {
  const match = messageLine.match(datePattern);
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
    return null;
  }
  
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
  } else if (timeParts[1].includes('AM') || timeParts[1].includes('PM')) {
    // Handle formats like "11:45 PM"
    const minutePart = timeParts[1].split(' ')[0];
    minute = parseInt(minutePart, 10);
    
    // Adjust hour for AM/PM
    if (timeParts[1].includes('PM') && hour < 12) {
      hour += 12;
    }
    if (timeParts[1].includes('AM') && hour === 12) {
      hour = 0;
    }
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

// --- JSON Mode Schema Definitions ---

interface SummarizedLink {
  name: string;        // Name of the tool/site
  type: string;        // Type: SaaS, article, video, etc.
  description: string; // Short description
  context?: string;     // Context from the message (optional)
  group?: string;       // Group name (optional)
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
  messageContext: string;
  date: Date;
  groupName?: string;
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
function extractLinksWithContext(message: string, messageDate: Date, lineNumber: number): LinkWithContext[] {
  const extractedLinks: LinkWithContext[] = [];
  
  if (!message || isSystemMessage(message)) {
    return extractedLinks;
  }
  
  // Simple case-insensitive check for "get-zenith.com" or similar patterns that might be missed
  if (message.toLowerCase().includes('get-zenith.com')) {
    console.log(`Found Get-zenith.com at line ${lineNumber} through direct check`);
    extractedLinks.push({
      url: 'Get-zenith.com',
      messageContext: message,
      date: messageDate
    });
  }
  
  const linksInMessage = Array.from(message.matchAll(urlPattern));
  
  if (linksInMessage.length > 0) {
    logLinkExtraction(lineNumber, message, linksInMessage);
    
    linksInMessage.forEach(match => {
      // Get context around this specific link
      const linkIndex = match.index || 0;
      const startContext = Math.max(0, linkIndex - 100);
      const endContext = Math.min(message.length, linkIndex + match[0].length + 100);
      const linkContext = message.substring(startContext, endContext).trim();
      
      extractedLinks.push({
        url: match[0],
        messageContext: linkContext,
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
      startDate = new Date(startDateStr);
      startDate = setToStartOfDay(startDate);
      console.log(`Parsed start date: ${startDate.toISOString()}`);
    }
    
    if (endDateStr) {
      endDate = new Date(endDateStr);
      endDate = setToEndOfDay(endDate);
      console.log(`Parsed end date: ${endDate.toISOString()}`);
    }
    
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
    
    if (files.length === 0) {
      return responseWithProgress('idle', { message: 'לא התקבלו קבצים' }, 400);
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
                  const isInRange = (!startDate || currentDate >= startDate) && 
                                    (!endDate || currentDate <= endDate);
                  
                  if (isInRange && currentDate instanceof Date) {
                    messagesInRange++;
                    console.log(`  -> Previous message in range (Date: ${currentDate.toISOString()}). Extracting links.`);
                    
                    // Extract links from the complete message
                    const extractedLinks = extractLinksWithContext(currentLine, currentDate, i);
                    
                    if (extractedLinks.length > 0) {
                      messagesWithLinks++;
                      // Add groupName to each extracted link
                      extractedLinks.forEach(link => link.groupName = groupName);
                      allLinksWithContext.push(...extractedLinks);
                    }
                  } else if (currentDate instanceof Date) {
                    console.log(`  -> Previous message OUT of range (Date: ${currentDate.toISOString()}).`);
                  }
                }
                
                // Extract the new date and start a new message
                currentDate = extractDateFromMessage(line);
                console.log(`  -> Parsed date from line: ${currentDate ? currentDate.toISOString() : 'null'}`);
                currentLine = line;
                
                // Also check the current line for links (in case they're in the same line as the date)
                if (currentDate instanceof Date) {
                  const isInRange = (!startDate || currentDate >= startDate) && 
                                    (!endDate || currentDate <= endDate);
                  console.log(`  -> Checking date line: Date=${currentDate.toISOString()}, Start=${startDate?.toISOString()}, End=${endDate?.toISOString()}, InRange=${isInRange}`);
                                      
                  if (isInRange) {
                    console.log(`     -> Date line IN range. Extracting links.`);
                    const dateLineLinks = extractLinksWithContext(line, currentDate, i);
                    if (dateLineLinks.length > 0) {
                      // Add groupName to each extracted link
                      dateLineLinks.forEach(link => link.groupName = groupName);
                      allLinksWithContext.push(...dateLineLinks);
                    }
                  } else if (currentDate instanceof Date) {
                    console.log(`  -> Previous message OUT of range (Date: ${currentDate.toISOString()}).`);
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
              const isInRange = (!startDate || currentDate >= startDate) && 
                                (!endDate || currentDate <= endDate);
              
              if (isInRange && currentDate instanceof Date) {
                messagesInRange++;
                
                // Extract links from the complete message
                const extractedLinks = extractLinksWithContext(currentLine, currentDate, lines.length);
                
                if (extractedLinks.length > 0) {
                  messagesWithLinks++;
                  // Add groupName to each extracted link
                  extractedLinks.forEach(link => link.groupName = groupName);
                  allLinksWithContext.push(...extractedLinks);
                }
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
                        const isInRange = (!startDate || currentDate >= startDate) && 
                                              (!endDate || currentDate <= endDate);
                        
                        if (isInRange && currentDate instanceof Date) {
                          messagesInRange++;
                          
                          // Extract links from the complete message
                          const extractedLinks = extractLinksWithContext(line, currentDate, i);
                          
                          if (extractedLinks.length > 0) {
                            messagesWithLinks++;
                            // Add groupName to each extracted link
                            extractedLinks.forEach(link => link.groupName = groupName);
                            allLinksWithContext.push(...extractedLinks);
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
                      const extractedLinks = extractLinksWithContext(currentLine, currentDate, allLines.length);
                      
                      if (extractedLinks.length > 0) {
                        messagesWithLinks++;
                        // Add groupName to each extracted link
                        extractedLinks.forEach(link => link.groupName = groupName);
                        allLinksWithContext.push(...extractedLinks);
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
      return responseWithProgress('idle', { 
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
      
      return responseWithProgress(
        'idle',
        { 
          message: errorMessage,
          details: {
            filesProcessed: files.length,
            chatFilesFound: totalChatFilesFound,
            dateRange: {
              start: startDate?.toISOString(),
              end: endDate?.toISOString()
            }
          }
        },
        404
      );
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

// --- JSON Mode Rendering Function ---

function renderSummaryFromJson(summaryJson: SummaryJson, dateRangeInfo: string, summaryDateInfo: string): string {
  let output = "לילה טוב לכולם. יום פורה עבר עלינו היום בקבוצות השונות\n\n";
  output += "*סיכום לינקים שפורסמו בקבוצות השונות בקהילה:*\n";
  output += `${dateRangeInfo ? dateRangeInfo : `תאריך הסיכום: תאריך-${summaryDateInfo}`}\n\n`;

  // Loop through categories in the JSON object
  for (const category in summaryJson) {
    if (Object.prototype.hasOwnProperty.call(summaryJson, category)) {
      output += `*${category.trim()}*\n`; // Category name (bold)
      const linksInCategory = summaryJson[category];

      // Loop through links within the category
      for (const link of linksInCategory) {
        output += `  - *${link.name || 'שם לא ידוע'}* - [${link.type || 'סוג לא ידוע'}]\n`; // Name (bold) - [Type]
        output += `    - תיאור: ${link.description || 'אין תיאור'}\n`;
        if (link.context) {
          output += `    - הקשר ההודעה: ${link.context}\n`;
        }
        if (link.group) {
          output += `    - קבוצה: ${link.group}\n`;
        }
        if (link.keyPoints && link.keyPoints.length > 0) {
          output += `    - נקודות מפתח:\n`;
          link.keyPoints.forEach(point => {
            output += `      • ${point}\n`;
          });
        }
        output += `    - ערך למשתמש: ${link.userValue || 'ערך לא צוין'}\n`;
        if (link.complexity) {
          output += `    - זמן/מורכבות: ${link.complexity}\n`;
        }
        output += `    - לינק: ${link.url}\n\n`; // Add extra newline for spacing
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
        * group: string (שם הקבוצה בה הלינק פורסם - חובה לכלול אם סופק בשדה groupName בקלט)
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
      // Optional: Add validation here using Zod or similar if needed
    } catch (parseError) {
      console.error('Failed to parse JSON response from OpenAI:', parseError);
      console.error('Raw OpenAI response content:', jsonContent);
      throw new Error('קיבלנו תשובה לא תקינה (לא JSON) מ-OpenAI');
    }

    // Step 4 & 5: Render JSON to formatted text and return
    const formattedSummary = renderSummaryFromJson(summaryJson, dateRangeInfo, summaryDateInfo);
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
        const simplifiedPrompt = `סכם את הלינקים הבאים בצורה מובנית ושימושית:
          ${processedLinks.slice(0, 20).map(link => {
            return `- הלינק: ${link.url}
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
        
        console.log(`Simplified prompt length: ${simplifiedPrompt.length} characters`);
        
        const fallbackResponse = await openai.chat.completions.create({
          model: 'gpt-4o-mini', // Changed from gpt-3.5-turbo
          messages: [
            { role: 'system', content: 'תן תשובה קצרה ועקבית במבנה המבוקש בעברית.' }, // System message adjusted
            { role: 'user', content: simplifiedPrompt }
          ],
          temperature: 0.2, // Lowered temperature for consistency
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

*סיכום לינקים שפורסמו בקבוצות השונות בקהילה:*
${dateRangeInfo ? dateRangeInfo : `תאריך-${summaryDateInfo}`}

*לינקים שנמצאו:*
${processedLinks.slice(0, 10).map(link => {
  // Try to extract domain name for a bit more context
  let domain = '';
  try {
    const url = new URL(link.url);
    domain = url.hostname.replace('www.', '');
  } catch (e) {
    domain = 'אתר';
  }
  return `- *${domain}*
  - תיאור: לינק מקבוצת הוואטסאפ
  - הקשר: ${link.messageContext.replace(link.url, '').substring(0, 100)}${link.messageContext.replace(link.url, '').length > 100 ? '...' : ''}
  - תאריך: ${link.date.toLocaleDateString('he-IL')}
  - לינק: ${link.url}`;
}).join('\n\n')}

(הסיכום המפורט נכשל עקב עומס - הצגת לינקים בלבד)`;
      }
    }
    
    // Re-throw the error with more context
    throw new Error(`OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 