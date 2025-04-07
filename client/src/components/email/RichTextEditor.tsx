import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Bold,
  Italic,
  Underline,
  PaintBucket,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Link,
  Image,
  FileText,
  Code,
  Eye,
  Info,
  Paperclip,
  Smile,
  Type
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  subject?: string;
  onSubjectChange?: (value: string) => void;
  showSubject?: boolean;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Write your email content here...",
  subject,
  onSubjectChange,
  showSubject = false,
}) => {
  const [activeTab, setActiveTab] = useState<string>("editor");
  const [editorValue, setEditorValue] = useState(value);
  const [previewHTML, setPreviewHTML] = useState("");

  useEffect(() => {
    setEditorValue(value);
  }, [value]);

  useEffect(() => {
    // Parse the HTML for preview
    setPreviewHTML(editorValue);
  }, [editorValue]);

  const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setEditorValue(newValue);
    onChange(newValue);
  };

  const insertAtCursor = (textToInsert: string) => {
    const textarea = document.querySelector('textarea[name="editor"]') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    
    const newText = before + textToInsert + after;
    setEditorValue(newText);
    onChange(newText);
    
    // Reset cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + textToInsert.length;
    }, 10);
  };

  const applyFormat = (tag: string) => {
    const textarea = document.querySelector('textarea[name="editor"]') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    
    if (selectedText) {
      const formattedText = `<${tag}>${selectedText}</${tag}>`;
      insertAtCursor(formattedText);
    } else {
      insertAtCursor(`<${tag}></${tag}>`);
    }
  };

  const insertLink = () => {
    const url = prompt("Enter URL:", "https://");
    if (url) {
      const linkText = prompt("Enter link text:", "Link text");
      if (linkText) {
        insertAtCursor(`<a href="${url}" target="_blank">${linkText}</a>`);
      }
    }
  };

  const insertTemplate = (template: string) => {
    switch (template) {
      case "signature":
        insertAtCursor(`
<div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px;">
  <p><strong>{{sender_name}}</strong><br />
  {{company_name}}<br />
  {{phone}}<br />
  <a href="mailto:{{email}}">{{email}}</a></p>
  <p><small>Confidentiality notice: This email is intended only for the recipient(s) above.</small></p>
</div>
        `);
        break;
      case "cta":
        insertAtCursor(`
<div style="text-align: center; margin: 20px 0;">
  <a href="{{cta_url}}" style="background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">{{cta_text}}</a>
</div>
        `);
        break;
      case "intro":
        insertAtCursor(`
<p>Hello {{name}},</p>
<p>I hope this email finds you well. I wanted to reach out to discuss {{topic}}.</p>
        `);
        break;
      default:
        break;
    }
  };

  const insertVariable = (variable: string) => {
    insertAtCursor(`{{${variable}}}`);
  };

  const fontSizeOptions = [
    { size: "12px", label: "Small" },
    { size: "16px", label: "Medium" },
    { size: "20px", label: "Large" },
    { size: "24px", label: "X-Large" },
    { size: "28px", label: "XX-Large" },
  ];

  const colorOptions = [
    { color: "#000000", label: "Black" },
    { color: "#4f46e5", label: "Primary" },
    { color: "#ef4444", label: "Red" },
    { color: "#22c55e", label: "Green" },
    { color: "#3b82f6", label: "Blue" },
    { color: "#f59e0b", label: "Orange" },
  ];

  const variables = [
    { name: "name", label: "Contact Name" },
    { name: "email", label: "Contact Email" },
    { name: "company", label: "Contact Company" },
    { name: "phone", label: "Contact Phone" },
    { name: "location", label: "Contact Location" },
    { name: "sender_name", label: "Your Name" },
    { name: "company_name", label: "Your Company" },
  ];

  const handleAttachFile = () => {
    alert("File attachment feature would be integrated here in a real implementation");
  };

  return (
    <div className="space-y-3">
      {showSubject && (
        <div className="space-y-2">
          <Label htmlFor="subject">Subject Line</Label>
          <Input
            id="subject"
            value={subject || ""}
            onChange={(e) => onSubjectChange && onSubjectChange(e.target.value)}
            placeholder="Enter email subject..."
            className="w-full"
          />
        </div>
      )}

      <Card className="border border-input">
        <CardContent className="p-0">
          {/* Toolbar */}
          <div className="bg-muted/50 border-b p-2 flex flex-wrap items-center gap-1">
            <Button 
              type="button" 
              variant="ghost" 
              size="icon"
              onClick={() => applyFormat("b")}
              title="Bold"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button 
              type="button" 
              variant="ghost" 
              size="icon"
              onClick={() => applyFormat("i")}
              title="Italic"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button 
              type="button" 
              variant="ghost" 
              size="icon"
              onClick={() => applyFormat("u")}
              title="Underline"
            >
              <Underline className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="mx-1 h-6" />

            <Button 
              type="button" 
              variant="ghost" 
              size="icon"
              onClick={() => insertAtCursor('<div style="text-align: left;">Text</div>')}
              title="Align Left"
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button 
              type="button" 
              variant="ghost" 
              size="icon"
              onClick={() => insertAtCursor('<div style="text-align: center;">Text</div>')}
              title="Align Center"
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button 
              type="button" 
              variant="ghost" 
              size="icon"
              onClick={() => insertAtCursor('<div style="text-align: right;">Text</div>')}
              title="Align Right"
            >
              <AlignRight className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="mx-1 h-6" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" title="Font Size">
                  <Type className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {fontSizeOptions.map((option) => (
                  <DropdownMenuItem 
                    key={option.size}
                    onClick={() => insertAtCursor(`<span style="font-size: ${option.size};">Text</span>`)}
                  >
                    <span style={{ fontSize: option.size }}>{option.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" title="Text Color">
                  <PaintBucket className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {colorOptions.map((option) => (
                  <DropdownMenuItem 
                    key={option.color}
                    onClick={() => insertAtCursor(`<span style="color: ${option.color};">Text</span>`)}
                  >
                    <div className="flex items-center">
                      <div 
                        className="w-4 h-4 mr-2 rounded" 
                        style={{ backgroundColor: option.color }}
                      />
                      <span>{option.label}</span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Separator orientation="vertical" className="mx-1 h-6" />

            <Button 
              type="button" 
              variant="ghost" 
              size="icon"
              onClick={() => insertAtCursor("<ul>\n  <li>Item 1</li>\n  <li>Item 2</li>\n</ul>")}
              title="Bullet List"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button 
              type="button" 
              variant="ghost" 
              size="icon"
              onClick={() => insertAtCursor("<ol>\n  <li>Item 1</li>\n  <li>Item 2</li>\n</ol>")}
              title="Numbered List"
            >
              <ListOrdered className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="mx-1 h-6" />

            <Button 
              type="button" 
              variant="ghost" 
              size="icon"
              onClick={insertLink}
              title="Insert Link"
            >
              <Link className="h-4 w-4" />
            </Button>
            <Button 
              type="button" 
              variant="ghost" 
              size="icon"
              onClick={handleAttachFile}
              title="Attach File"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button 
              type="button" 
              variant="ghost" 
              size="icon"
              onClick={() => insertAtCursor('<img src="https://via.placeholder.com/600x200" alt="Image Description" width="100%" />')}
              title="Insert Image"
            >
              <Image className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="mx-1 h-6" />

            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  className="gap-1"
                  title="Insert Template"
                >
                  <FileText className="h-4 w-4" />
                  <span className="sr-only md:not-sr-only md:text-xs">Templates</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56" align="start">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Insert Template</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-left font-normal"
                    onClick={() => insertTemplate("signature")}
                  >
                    Email Signature
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-left font-normal"
                    onClick={() => insertTemplate("cta")}
                  >
                    Call to Action Button
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-left font-normal"
                    onClick={() => insertTemplate("intro")}
                  >
                    Introduction Paragraph
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  className="gap-1"
                  title="Insert Variable"
                >
                  <Code className="h-4 w-4" />
                  <span className="sr-only md:not-sr-only md:text-xs">Variables</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56" align="start">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Insert Variable</h4>
                  <div className="grid gap-1">
                    {variables.map((variable) => (
                      <Button
                        key={variable.name}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="justify-start text-left font-normal"
                        onClick={() => insertVariable(variable.name)}
                      >
                        {variable.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  className="gap-1 ml-auto"
                  title="Emojis"
                >
                  <Smile className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="end">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Insert Emoji</h4>
                  <div className="grid grid-cols-8 gap-2">
                    {['😊','👍','🎉','✨','💯','🔥','❤️','👏','🙌','🤝','📧','📅','⭐','🚀','💡','👋','🙏','💪'].map((emoji) => (
                      <Button
                        key={emoji}
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => insertAtCursor(emoji)}
                      >
                        {emoji}
                      </Button>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <Tabs defaultValue="editor" onValueChange={setActiveTab}>
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
              <TabsTrigger
                value="editor"
                className={`rounded-none border-b-2 border-b-transparent px-4 py-2 ${
                  activeTab === "editor" ? "border-b-primary" : ""
                }`}
              >
                Editor
              </TabsTrigger>
              <TabsTrigger
                value="preview"
                className={`rounded-none border-b-2 border-b-transparent px-4 py-2 ${
                  activeTab === "preview" ? "border-b-primary" : ""
                }`}
              >
                Preview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="editor" className="p-0">
              <Textarea
                name="editor"
                value={editorValue}
                onChange={handleEditorChange}
                className="min-h-[400px] rounded-none border-0 border-b font-mono text-sm resize-y focus-visible:ring-0"
                placeholder={placeholder}
              />
            </TabsContent>

            <TabsContent value="preview" className="p-4 min-h-[400px] border-b">
              {previewHTML ? (
                <div 
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: previewHTML }} 
                />
              ) : (
                <div className="text-muted-foreground">No content to preview</div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Alert variant="default">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs text-muted-foreground">
          HTML formatting is supported. You can insert variables like <code className="text-xs">{"{{name}}"}</code> that will be replaced with contact data.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default RichTextEditor;