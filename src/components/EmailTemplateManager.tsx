
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Mail, Plus, Edit, Copy, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  type: "outreach" | "follow-up" | "demo-booking" | "nurture";
  variables: string[];
}

const EmailTemplateManager = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([
    {
      id: "1",
      name: "Initial Developer Outreach",
      subject: "Exciting opportunity at {company_name}",
      content: `Hi {first_name},

I hope this message finds you well. I came across your profile and was impressed by your {skills} experience.

We have an exciting {job_title} position at {company_name} that I believe would be a great fit for your background.

Would you be interested in a brief conversation to learn more?

Best regards,
{recruiter_name}`,
      type: "outreach",
      variables: ["first_name", "company_name", "skills", "job_title", "recruiter_name"]
    },
    {
      id: "2",
      name: "Demo Follow-up",
      subject: "Thank you for booking a demo with {company_name}",
      content: `Hi {first_name},

Thank you for booking a demo with us! We're excited to show you how {company_name} can help transform your recruitment process.

Your demo is scheduled for {demo_date} at {demo_time}.

Looking forward to speaking with you!

Best regards,
{recruiter_name}`,
      type: "demo-booking",
      variables: ["first_name", "company_name", "demo_date", "demo_time", "recruiter_name"]
    }
  ]);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: "",
    subject: "",
    content: "",
    type: "outreach" as EmailTemplate["type"]
  });
  const { toast } = useToast();

  const handleSaveTemplate = () => {
    if (!templateForm.name || !templateForm.subject || !templateForm.content) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Extract variables from content
    const variables = Array.from(templateForm.content.matchAll(/\{([^}]+)\}/g))
      .map(match => match[1])
      .filter((value, index, self) => self.indexOf(value) === index);

    const newTemplate: EmailTemplate = {
      id: editingTemplate?.id || Date.now().toString(),
      name: templateForm.name,
      subject: templateForm.subject,
      content: templateForm.content,
      type: templateForm.type,
      variables
    };

    if (editingTemplate) {
      setTemplates(templates.map(t => t.id === editingTemplate.id ? newTemplate : t));
      toast({
        title: "Template Updated",
        description: "Email template has been updated successfully",
      });
    } else {
      setTemplates([...templates, newTemplate]);
      toast({
        title: "Template Created",
        description: "Email template has been created successfully",
      });
    }

    setIsDialogOpen(false);
    setEditingTemplate(null);
    setTemplateForm({ name: "", subject: "", content: "", type: "outreach" });
  };

  const handleEditTemplate = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      subject: template.subject,
      content: template.content,
      type: template.type
    });
    setIsDialogOpen(true);
  };

  const handleDeleteTemplate = (templateId: string) => {
    setTemplates(templates.filter(t => t.id !== templateId));
    toast({
      title: "Template Deleted",
      description: "Email template has been deleted successfully",
    });
  };

  const getTypeColor = (type: EmailTemplate["type"]) => {
    switch (type) {
      case "outreach": return "bg-blue-100 text-blue-800";
      case "follow-up": return "bg-green-100 text-green-800";
      case "demo-booking": return "bg-purple-100 text-purple-800";
      case "nurture": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Email Templates</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? "Edit Template" : "Create Email Template"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="templateName">Template Name</Label>
                  <Input
                    id="templateName"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    placeholder="e.g., Senior Developer Outreach"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="templateType">Type</Label>
                  <Select value={templateForm.type} onValueChange={(value: EmailTemplate["type"]) => setTemplateForm({ ...templateForm, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="outreach">Outreach</SelectItem>
                      <SelectItem value="follow-up">Follow-up</SelectItem>
                      <SelectItem value="demo-booking">Demo Booking</SelectItem>
                      <SelectItem value="nurture">Nurture</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="templateSubject">Subject Line</Label>
                <Input
                  id="templateSubject"
                  value={templateForm.subject}
                  onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                  placeholder="e.g., Exciting opportunity at {company_name}"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="templateContent">Email Content</Label>
                <Textarea
                  id="templateContent"
                  value={templateForm.content}
                  onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })}
                  placeholder="Write your email template here. Use {variable_name} for dynamic content."
                  rows={10}
                />
                <p className="text-xs text-gray-500">
                  Use {`{variable_name}`} syntax for dynamic content (e.g., {`{first_name}`}, {`{company_name}`})
                </p>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveTemplate}>
                  {editingTemplate ? "Update Template" : "Create Template"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card key={template.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <Badge className={getTypeColor(template.type)}>
                    {template.type}
                  </Badge>
                </div>
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditTemplate(template)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTemplate(template.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Subject:</p>
                  <p className="text-sm text-gray-600">{template.subject}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Variables:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {template.variables.map((variable) => (
                      <Badge key={variable} variant="outline" className="text-xs">
                        {`{${variable}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {template.content.substring(0, 100)}...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default EmailTemplateManager;
