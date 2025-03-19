"use client";

import { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

type ProcessStep = 'idle' | 'uploading' | 'filtering' | 'extracting' | 'analyzing' | 'complete';

// Define interface for API error responses
interface ApiError {
  message?: string;
  error?: string;
  details?: unknown;
}

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [processStep, setProcessStep] = useState<ProcessStep>('idle');
  const [summary, setSummary] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [errorDetails, setErrorDetails] = useState<ApiError | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [dateRangeText, setDateRangeText] = useState<string>("");
  const [isSameDaySelected, setIsSameDaySelected] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Client-side only operations
  useEffect(() => {
    // Check if same day is selected
    if (startDate && endDate) {
      const sameDay = 
        startDate.getDate() === endDate.getDate() &&
        startDate.getMonth() === endDate.getMonth() &&
        startDate.getFullYear() === endDate.getFullYear();
      
      setIsSameDaySelected(sameDay);
      
      // Format date range text
      if (sameDay) {
        setDateRangeText("נבחר יום אחד - יוצגו כל ההודעות מהשעה 00:00 עד 23:59:59 בתאריך זה");
      } else {
        // Format dates in a locale-safe way
        const startFormatted = startDate.toLocaleDateString('he-IL');
        const endFormatted = endDate.toLocaleDateString('he-IL');
        setDateRangeText(`נבחר טווח תאריכים מ-${startFormatted} עד ${endFormatted}`);
      }
    } else {
      setIsSameDaySelected(false);
      setDateRangeText("");
    }
  }, [startDate, endDate]);

  // Reset copy success message after 3 seconds
  useEffect(() => {
    if (copySuccess) {
      const timer = setTimeout(() => {
        setCopySuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [copySuccess]);

  // Progress steps timers
  useEffect(() => {
    let timers: NodeJS.Timeout[] = [];
    
    if (loading && processStep === 'uploading') {
      // Start the progress steps simulation
      const filteringTimer = setTimeout(() => {
        setProcessStep('filtering');
      }, 2000);
      
      const extractingTimer = setTimeout(() => {
        setProcessStep('extracting');
      }, 4000);
      
      const analyzingTimer = setTimeout(() => {
        setProcessStep('analyzing');
      }, 6000);
      
      timers = [filteringTimer, extractingTimer, analyzingTimer];
    }
    
    // Clean up timers
    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [loading, processStep]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileArray = Array.from(e.target.files);
      setFiles(fileArray);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (files.length === 0) {
      setError("אנא העלה לפחות קובץ זיפ אחד");
      return;
    }
    
    setLoading(true);
    setError("");
    setErrorDetails(null);
    setSummary("");
    setProcessStep('uploading');
    
    const formData = new FormData();
    files.forEach((file) => {
      formData.append(`files`, file);
    });
    
    // Add date filters to the form data if selected
    if (startDate) {
      formData.append('startDate', startDate.toISOString());
    }
    
    if (endDate) {
      formData.append('endDate', endDate.toISOString());
    }
    
    try {
      console.log('Sending request to /api/analyze');
      setProcessStep('uploading');
      
      // Start the process
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });
      
      console.log(`Response status: ${response.status}`);
      
      if (!response.ok) {
        console.error('Error response from server:', response.status, response.statusText);
        
        let errorMessage = "שגיאה בעיבוד הקבצים";
        let isNotFoundError = response.status === 404;
        
        // Always set loading to false when an error occurs
        setLoading(false);
        setProcessStep('idle');
        
        try {
          // Try to parse the error response as JSON
          const errorData = await response.json() as ApiError;
          console.error('Error details:', errorData);
          
          if (errorData.message) {
            errorMessage = errorData.message;
          }
          
          // Store additional details for display
          setErrorDetails(errorData);
          
          // Handle 404 errors (no links or chat files found) by showing a user-friendly message
          if (isNotFoundError) {
            console.log('Handling as a user-friendly 404 error (no links found)');
            setError(errorMessage);
            return; // Exit early after setting the error message
          }
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          errorMessage = `שגיאה ${response.status}: ${response.statusText}`;
          
          try {
            const textResponse = await response.text();
            console.error('Error response text:', textResponse);
            setErrorDetails({
              error: textResponse
            });
          } catch (textError) {
            console.error('Failed to get error text:', textError);
          }
        }
        
        setError(errorMessage);
        return; // Stop further execution
      }
      
      // Success, set final state
      setProcessStep('complete');
      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.summary) {
        setSummary(data.summary);
      } else if (data.message) {
        setError(data.message);
        setErrorDetails(data);
      } else {
        setError('התקבלה תשובה לא תקינה מהשרת');
        setErrorDetails(data);
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      const errorMessage = error instanceof Error ? error.message : "שגיאה לא ידועה";
      setError(errorMessage);
      
      setErrorDetails({
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error
      });
      
      setProcessStep('idle');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(summary)
      .then(() => {
        setCopySuccess(true);
      })
      .catch(() => {
        setError("שגיאה בהעתקה ללוח");
      });
  };

  // Progress step labels in Hebrew
  const progressSteps = {
    idle: "",
    uploading: "מעלה קבצים...",
    filtering: "מסנן לפי תאריכים...",
    extracting: "מחלץ לינקים...",
    analyzing: "מנתח ומסכם לינקים עם בינה מלאכותית...",
    complete: "הושלם בהצלחה!"
  };

  // Fix the errorDetails rendering in the JSX
  const renderErrorDetails = () => {
    if (!errorDetails) return null;
    
    return (
      <div className="mt-4 p-4 bg-red-100 text-red-900 rounded-md">
        <p className="font-bold mb-2">פרטי שגיאה (למפתחים):</p>
        <pre className="bg-red-950 p-3 rounded overflow-auto text-xs max-h-40">
          {JSON.stringify(errorDetails, null, 2)}
        </pre>
      </div>
    );
  };

  // Error message section with improved guidance
  const renderErrorMessage = () => {
    if (!error) return null;
    
    // Check if the error is about missing chat files or links
    const isMissingFiles = error.includes('לא נמצאו לינקים') || error.includes('קבצים');
    
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4 my-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="mr-3 w-full">
            <h3 className="text-sm font-medium text-red-800">{error}</h3>
            
            {isMissingFiles && (
              <div className="mt-2">
                <button 
                  onClick={() => setShowHelp(true)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium underline"
                >
                  הצג הנחיות ליצוא צ'אט מוואטסאפ
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  // WhatsApp export help dialog
  const renderHelpDialog = () => {
    if (!showHelp) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 relative overflow-y-auto max-h-[90vh]">
          <button 
            onClick={() => setShowHelp(false)}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <h2 className="text-xl font-bold mb-4 text-right">איך לייצא צ'אט מוואטסאפ</h2>
          
          <div className="text-right space-y-4">
            <p className="font-medium">כדי שהכלי יעבוד, צריך לייצא את הצ'אט מוואטסאפ בפורמט הנכון:</p>
            
            <div className="border-r-2 border-blue-500 pr-4">
              <h3 className="font-bold text-lg">בטלפון נייד:</h3>
              <ol className="list-decimal list-inside space-y-2 pr-4">
                <li>פתח את הצ'אט שברצונך לייצא</li>
                <li>הקש על שלוש הנקודות (⋮) בפינה הימנית העליונה</li>
                <li>בחר <strong>עוד</strong> {'>'}  <strong>ייצא צ'אט</strong></li>
                <li>בחר <strong>ללא מדיה</strong> (אלא אם תרצה גם תמונות וסרטונים)</li>
                <li>הקובץ יישמר ב<strong>קבצים</strong> או <strong>הורדות</strong> בטלפון</li>
                <li>העבר את הקובץ למחשב ועלה אותו לכלי כמו שהוא (בפורמט ZIP)</li>
              </ol>
            </div>
            
            <div className="border-r-2 border-green-500 pr-4">
              <h3 className="font-bold text-lg">בווטסאפ ווב (מהמחשב):</h3>
              <ol className="list-decimal list-inside space-y-2 pr-4">
                <li>פתח את הצ'אט שברצונך לייצא</li>
                <li>לחץ על שלוש הנקודות (⋮) ליד שם הצ'אט</li>
                <li>בחר <strong>ייצא צ'אט</strong></li>
                <li>בחר <strong>ללא מדיה</strong></li>
                <li>הקובץ יישמר בתיקיית <strong>הורדות</strong> במחשב</li>
                <li>עלה את קובץ ה-ZIP לכלי בלי לשנות אותו</li>
              </ol>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded">
              <p className="font-bold">חשוב לדעת:</p>
              <ul className="list-disc list-inside space-y-1 pr-4">
                <li>אל תשנו את שם הקובץ לאחר הייצוא</li>
                <li>אל תחלצו את קובץ ה-ZIP - עלו אותו כמו שהוא</li>
                <li>הכלי תומך בכל פורמט ייצוא וואטסאפ עם תבניות תאריך כגון:
                  <ul className="list-disc list-inside space-y-1 pr-8 mt-1 text-gray-700">
                    <li dir="ltr">[25/03/2024, 14:30:45]</li>
                    <li dir="ltr">22.9.2024, 14:33 -</li>
                  </ul>
                </li>
                <li>אם אתם מקבלים שגיאה, נסו לייצא שוב מהטלפון הנייד</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setShowHelp(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              הבנתי
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <main dir="rtl" className="min-h-screen p-4 md:p-8 lg:p-12 max-w-4xl mx-auto bg-black text-white">
      <h1 className="text-3xl font-bold mb-8 text-center text-white">סיכום לינקים מקבוצות וואטסאפ</h1>
      
      {/* Add the help dialog */}
      {renderHelpDialog()}
      
      <div className="bg-gray-800 shadow-md rounded-lg p-6 mb-8 border border-gray-700">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="files" className="block text-lg font-medium mb-2 text-white">
              העלאת קבצי זיפ מוואטסאפ
            </label>
            <p className="text-sm text-gray-300 mb-4">
              ניתן להעלות מספר קבצי זיפ (אקספורט של שיחות וואטסאפ)
            </p>
            <input
              type="file"
              id="files"
              accept=".zip"
              multiple
              onChange={handleFileChange}
              className="block w-full p-2 border border-gray-600 rounded bg-gray-700 text-white"
            />
            {files.length > 0 && (
              <div className="mt-2 text-sm text-white">
                {files.length} {files.length === 1 ? "קובץ" : "קבצים"} נבחרו
              </div>
            )}
          </div>
          
          <div className="space-y-4">
            <label className="block text-lg font-medium mb-2 text-white">
              סינון לפי תאריכים
            </label>
            <p className="text-sm text-gray-300 mb-4">
              בחר טווח תאריכים לסינון השיחות (אופציונלי)
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1 text-white">
                  מתאריך
                </label>
                <DatePicker
                  selected={startDate}
                  onChange={(date: Date | null) => setStartDate(date)}
                  selectsStart
                  startDate={startDate || undefined}
                  endDate={endDate || undefined}
                  className="block w-full p-2 border border-gray-600 rounded bg-gray-700 text-white"
                  dateFormat="dd/MM/yyyy"
                  placeholderText="בחר תאריך התחלה"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1 text-white">
                  עד תאריך
                </label>
                <DatePicker
                  selected={endDate}
                  onChange={(date: Date | null) => setEndDate(date)}
                  selectsEnd
                  startDate={startDate || undefined}
                  endDate={endDate || undefined}
                  minDate={startDate || undefined}
                  className="block w-full p-2 border border-gray-600 rounded bg-gray-700 text-white"
                  dateFormat="dd/MM/yyyy"
                  placeholderText="בחר תאריך סיום"
                />
              </div>
            </div>
            
            {/* Date selection hint - only show when there's actual text to display */}
            {dateRangeText && (
              <div className={`mt-2 text-sm ${isSameDaySelected ? 'text-blue-400' : 'text-gray-300'}`}>
                {dateRangeText}
              </div>
            )}
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-600"
          >
            {loading ? "מעבד..." : "סכם לינקים"}
          </button>
        </form>
      </div>

      {/* Progress Indicator */}
      {loading && processStep !== 'idle' && (
        <div className="bg-gray-800 shadow-md rounded-lg p-6 mb-8 border border-gray-700">
          <h2 className="text-xl font-bold mb-4 text-white">מצב התהליך</h2>
          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              {/* Progress Steps */}
              {(['uploading', 'filtering', 'extracting', 'analyzing'] as ProcessStep[]).map((step, index) => (
                <div key={step} className="flex items-center">
                  <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center mr-2 ${
                    processStep === step 
                      ? 'bg-blue-600 animate-pulse' 
                      : processStep === 'complete' || 
                        ['uploading', 'filtering', 'extracting', 'analyzing'].indexOf(processStep) > 
                        ['uploading', 'filtering', 'extracting', 'analyzing'].indexOf(step)
                        ? 'bg-green-600' 
                        : 'bg-gray-600'
                  }`}>
                    {processStep === 'complete' || 
                      ['uploading', 'filtering', 'extracting', 'analyzing'].indexOf(processStep) > 
                      ['uploading', 'filtering', 'extracting', 'analyzing'].indexOf(step) ? (
                      <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <span className="text-white text-sm">{index + 1}</span>
                    )}
                  </div>
                  <div>
                    <p className={`font-medium ${processStep === step ? 'text-blue-400' : processStep === 'complete' || ['uploading', 'filtering', 'extracting', 'analyzing'].indexOf(processStep) > ['uploading', 'filtering', 'extracting', 'analyzing'].indexOf(step) ? 'text-green-400' : 'text-gray-400'}`}>
                      {progressSteps[step]}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-700 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                style={{ 
                  width: `${processStep === 'uploading' ? 25 : 
                          processStep === 'filtering' ? 50 : 
                          processStep === 'extracting' ? 75 :
                          processStep === 'analyzing' ? 90 :
                          processStep === 'complete' ? 100 : 0}%` 
                }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Improved error message rendering */}
      {error && renderErrorMessage()}

      {summary && (
        <div className="bg-gray-800 shadow-md rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-bold mb-4 text-white">סיכום הלינקים</h2>
          <div 
            className="whitespace-pre-wrap text-white text-right rtl"
            style={{ 
              direction: 'rtl', 
              textAlign: 'right',
              unicodeBidi: 'embed'
            }}
          >
            {summary}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={handleCopyToClipboard}
              className={`py-2 px-4 rounded flex items-center gap-2 ${
                copySuccess 
                  ? "bg-green-600 hover:bg-green-700" 
                  : "bg-gray-600 hover:bg-gray-700"
              } text-white transition-colors duration-300`}
            >
              {copySuccess ? (
                <>
                  <span>הועתק בהצלחה!</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </>
              ) : (
                "העתק לקליפבורד"
              )}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
