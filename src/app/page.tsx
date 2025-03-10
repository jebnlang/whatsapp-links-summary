"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

type ProcessStep = 'idle' | 'uploading' | 'filtering' | 'extracting' | 'analyzing' | 'complete';

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [processStep, setProcessStep] = useState<ProcessStep>('idle');
  const [summary, setSummary] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [dateRangeText, setDateRangeText] = useState<string>("");
  const [isSameDaySelected, setIsSameDaySelected] = useState(false);

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
      // Start the process
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "שגיאה בעיבוד הקבצים");
      }

      // Success, set final state
      setProcessStep('complete');
      const data = await response.json();
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה לא ידועה");
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

  return (
    <main dir="rtl" className="min-h-screen p-4 md:p-8 lg:p-12 max-w-4xl mx-auto bg-black text-white">
      <h1 className="text-3xl font-bold mb-8 text-center text-white">סיכום לינקים מקבוצות וואטסאפ</h1>
      
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

      {error && (
        <div className="bg-red-900 text-white p-4 rounded-md mb-8 border border-red-700">
          {error}
        </div>
      )}

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
