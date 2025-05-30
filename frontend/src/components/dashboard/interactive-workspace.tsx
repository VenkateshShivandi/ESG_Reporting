import React from "react"
import { useState, useRef, useEffect } from "react"
import { X, ArrowDownToLine, FileText, Undo, Redo, HelpCircle, Edit3, Zap, Highlighter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { toast } from "sonner"

interface Report {
  id: string;
  type: string;
  timestamp: Date;
  files: string[];
  content?: string;
}

interface InteractiveWorkspaceProps {
  report: Report | null;
  onClose: () => void;
  append?: (message: { role: string; content: string }) => void;
}

export function InteractiveWorkspace({
  report,
  onClose,
  append
}: InteractiveWorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // Editor state
  const [reportContent, setReportContent] = useState<string>("");
  const [selectedText, setSelectedText] = useState<string>("");
  const [selectionRange, setSelectionRange] = useState<Range | null>(null);

  // Version history
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Initialize editor with report content
  useEffect(() => {
    if (report && editorRef.current) {
      // Format the content properly as HTML, not markdown
      // Start with a reasonable default structure if no content is provided
      let formattedContent = "";

      if (report.content) {
        // If content is provided, use it
        formattedContent = report.content;
      } else {
        // Create a structured HTML report template
        formattedContent = `
          <h1 class="text-2xl font-bold text-[#2E7D32] mb-2">Environmental, Social, and Governance Report</h1>
          <p class="text-sm text-slate-500 mb-4">Generated on ${new Date().toLocaleDateString()}</p>
          
          <h2 class="text-xl font-semibold border-b pb-2 mt-6 mb-4">Executive Summary</h2>
          <p class="mb-4">
            This report provides an analysis of the organization's ESG performance based on the documents 
            provided and industry benchmarks. Key insights and recommendations are outlined below.
          </p>
          
          <h2 class="text-xl font-semibold border-b pb-2 mt-6 mb-4">Environmental Performance</h2>
          <h3 class="text-lg font-medium mt-4 mb-2">Carbon Emissions</h3>
          <div class="bg-slate-50 rounded-lg p-4 border mb-4">
            <div class="flex justify-between items-center mb-2">
              <span class="font-medium">Total Emissions (CO2e)</span>
              <span class="font-semibold">25,430 tons</span>
            </div>
            <div class="w-full bg-slate-200 rounded-full h-2.5">
              <div class="bg-emerald-600 h-2.5 rounded-full" style="width: 65%"></div>
            </div>
          </div>
          
          <h2 class="text-xl font-semibold border-b pb-2 mt-6 mb-4">Social Performance</h2>
          <p class="mb-4">
            The organization demonstrates strong commitment to diversity, inclusion, and employee 
            well-being. Key areas for improvement include expanding community engagement programs 
            and enhancing supply chain monitoring.
          </p>
          
          <h2 class="text-xl font-semibold border-b pb-2 mt-6 mb-4">Governance</h2>
          <p class="mb-4">
            The governance structure demonstrates compliance with regulatory requirements. 
            Recommendations include enhancing board diversity and implementing more robust 
            risk management frameworks.
          </p>
        `;
      }

      // Set the content to the editor
      editorRef.current.innerHTML = formattedContent;

      // Save initial content to history
      setReportContent(formattedContent);
      setHistory([formattedContent]);
      setHistoryIndex(0);
    }
  }, [report]);

  // Function to capture text selection
  const handleTextSelection = () => {
    if (window.getSelection) {
      const selection = window.getSelection();

      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);

        // Only set selection if it's inside our editor
        if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
          const selectedContent = selection.toString().trim();

          if (selectedContent) {
            setSelectedText(selectedContent);
            setSelectionRange(range.cloneRange());
            return;
          }
        }

        // Clear selection if no text is selected or selection is outside editor
        setSelectedText("");
        setSelectionRange(null);
      }
    }
  };

  // Function to track content changes
  const handleContentChange = () => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;

      // Only update history if content actually changed
      if (newContent !== history[historyIndex]) {
        // Add new content to history, truncating any future history
        const newHistory = history.slice(0, historyIndex + 1).concat(newContent);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        setReportContent(newContent);
      }
    }
  };

  // Undo/Redo functionality
  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      if (editorRef.current) {
        editorRef.current.innerHTML = history[historyIndex - 1];
      }
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      if (editorRef.current) {
        editorRef.current.innerHTML = history[historyIndex + 1];
      }
    }
  };

  // Function to apply AI suggestions to the report
  const applyAISuggestion = (suggestion: string) => {
    if (selectionRange && editorRef.current) {
      // Replace the selected text with the suggestion
      selectionRange.deleteContents();
      selectionRange.insertNode(document.createTextNode(suggestion));

      // Add to history
      const newContent = editorRef.current.innerHTML;
      const newHistory = history.slice(0, historyIndex + 1).concat(newContent);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);

      // Clear selection
      setSelectedText("");
      setSelectionRange(null);

      toast.success("Applied suggestion to report");
    } else {
      toast.error("Please select text to apply this suggestion");
    }
  };

  // Function to request specific AI adjustments
  const requestAIAdjustment = (adjustmentType: string) => {
    if (!append) {
      toast.error("AI integration is not available");
      return;
    }

    let prompt = "";

    if (selectedText) {
      // For selected text
      switch (adjustmentType) {
        case "improve":
          prompt = `Please improve this text to be more professional and precise: "${selectedText}"`;
          break;
        case "expand":
          prompt = `Please expand on this with more details and examples: "${selectedText}"`;
          break;
        case "shorten":
          prompt = `Please make this more concise while keeping key points: "${selectedText}"`;
          break;
        case "metrics":
          prompt = `Please suggest additional ESG metrics or data points that could enhance this section: "${selectedText}"`;
          break;
        default:
          prompt = `Please help me improve this text: "${selectedText}"`;
      }
    } else {
      // For general report adjustments
      switch (adjustmentType) {
        case "improve":
          prompt = `Please suggest ways to improve the overall report quality and professionalism.`;
          break;
        case "expand":
          prompt = `Please suggest additional sections or content that would enhance this ESG report.`;
          break;
        case "shorten":
          prompt = `Please suggest how I could make this report more concise while retaining key information.`;
          break;
        case "metrics":
          prompt = `Please suggest additional ESG metrics or data points that could enhance this report.`;
          break;
        default:
          prompt = `Please help me improve this ESG report.`;
      }
    }

    // Use the append function to add the message to the chat
    append({
      role: "user",
      content: prompt
    });

    toast.success(`Sent request to AI assistant`);
  };

  // Export the report
  const handleExport = () => {
    if (editorRef.current) {
      // Create a styled HTML document for export
      const reportContent = editorRef.current.innerHTML;
      const exportHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${report?.type || 'ESG'} Report - ${new Date().toLocaleDateString()}</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              max-width: 800px; 
              margin: 0 auto; 
              padding: 20px; 
            }
            h1 { color: #2E7D32; font-size: 28px; margin-bottom: 10px; }
            h2 { font-size: 22px; border-bottom: 1px solid #ddd; padding-bottom: 8px; margin-top: 25px; color: #2E7D32; }
            h3 { font-size: 18px; margin-top: 20px; color: #2E7D32; }
            p { margin-bottom: 16px; }
            .metric-card { 
              background: #f8f9fa; 
              border: 1px solid #ddd; 
              border-radius: 5px; 
              padding: 15px; 
              margin: 10px 0; 
            }
            .progress-bar-bg { 
              background: #e9ecef; 
              height: 8px; 
              border-radius: 4px; 
              margin: 8px 0; 
            }
            .progress-bar { 
              background: #2E7D32; 
              height: 8px; 
              border-radius: 4px; 
            }
            table { 
              border-collapse: collapse; 
              width: 100%; 
              margin: 16px 0; 
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 8px; 
              text-align: left; 
            }
            th { 
              background-color: #f2f2f2; 
              font-weight: bold; 
            }
            ul, ol { 
              margin: 16px 0; 
              padding-left: 20px; 
            }
            li { 
              margin-bottom: 8px; 
            }
            .container {
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .footer {
              margin-top: 50px;
              text-align: center;
              font-size: 12px;
              color: #666;
              border-top: 1px solid #ddd;
              padding-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${report?.type || 'ESG'} REPORT</h1>
              <p>Generated on ${new Date().toLocaleDateString()}</p>
            </div>
            
            ${reportContent}
            
            <div class="footer">
              <p>This report was generated by ESG Reporting Platform.</p>
              <p>© ${new Date().getFullYear()} ESG Reporting - All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Create a blob and download
      const blob = new Blob([exportHTML], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report?.type || 'esg'}-report-${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Report exported successfully');
    } else {
      toast.error('Error exporting report');
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full w-full overflow-hidden"
    >
      {/* Editor Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-semibold">{report?.type} Report</h2>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleUndo} disabled={historyIndex <= 0}>
                  <Undo className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Undo</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleRedo} disabled={historyIndex >= history.length - 1}>
                  <Redo className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Redo</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleExport} className="gap-1">
                  <ArrowDownToLine className="h-4 w-4" />
                  <span>Export</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export Report</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close" data-testid="close-button">
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Editor Toolbar */}
      <div className="flex items-center px-6 py-2 border-b bg-white">
        <div className="flex gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1">
                <Edit3 className="h-4 w-4" />
                <span>Edit</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => requestAIAdjustment("improve")}>Improve Writing</DropdownMenuItem>
              <DropdownMenuItem onClick={() => requestAIAdjustment("expand")}>Expand Content</DropdownMenuItem>
              <DropdownMenuItem onClick={() => requestAIAdjustment("shorten")}>Make Concise</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Format Text</DropdownMenuItem>
              <DropdownMenuItem>Insert Image</DropdownMenuItem>
              <DropdownMenuItem>Insert Table</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1"
            onClick={() => requestAIAdjustment("metrics")}
          >
            <Zap className="h-4 w-4" />
            <span>Add Metrics</span>
          </Button>

          <Button
            variant={selectedText ? "default" : "ghost"}
            size="sm"
            className="h-8 gap-1"
            disabled={!selectedText}
            onClick={() => {
              if (selectedText && append) {
                append({
                  role: "user",
                  content: `Please suggest improvements for this text: "${selectedText}"`,
                });
                toast.success("Sent selection to AI assistant");
              }
            }}
          >
            <Highlighter className="h-4 w-4" />
            <span>Suggest for Selection</span>
          </Button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 p-6 bg-white overflow-auto" style={{
        scrollbarWidth: 'none', /* Firefox */
        msOverflowStyle: 'none' /* IE and Edge */
      }}>
        <div className="max-w-3xl mx-auto">
          <div
            ref={editorRef}
            className="outline-none max-w-3xl mx-auto prose prose-emerald prose-headings:text-emerald-800 prose-a:text-emerald-600"
            contentEditable={true}
            onInput={handleContentChange}
            onSelect={handleTextSelection}
            style={{ minHeight: "calc(100vh - 60px)" }}
          ></div>
        </div>
        <style>{`
          /* Hide scrollbar for Chrome, Safari and Opera */
          ::-webkit-scrollbar {
            display: none;
          }
        `}</style>
      </div>
    </div>
  );
} 