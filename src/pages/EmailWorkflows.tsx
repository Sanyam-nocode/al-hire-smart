
import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Settings, Play, Pause, BarChart3, Users, Calendar } from "lucide-react";
import WorkflowBuilder from "@/components/WorkflowBuilder";
import EmailTemplateManager from "@/components/EmailTemplateManager";
import CampaignStats from "@/components/CampaignStats";
import { useToast } from "@/hooks/use-toast";

const EmailWorkflows = () => {
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState("");
  const [selectedWorkflow, setSelectedWorkflow] = useState("");
  const { toast } = useToast();

  const workflowTypes = [
    {
      id: "outreach",
      name: "Candidate Outreach",
      description: "Automated outreach emails to potential candidates",
      icon: Users,
      color: "bg-blue-500"
    },
    {
      id: "demo-booking",
      name: "Demo Booking Follow-up",
      description: "Follow-up sequences for demo bookings",
      icon: Calendar,
      color: "bg-green-500"
    },
    {
      id: "nurture",
      name: "Lead Nurturing",
      description: "Multi-step nurturing campaigns",
      icon: Mail,
      color: "bg-purple-500"
    }
  ];

  const handleSaveN8nConfig = () => {
    if (!n8nWebhookUrl) {
      toast({
        title: "Error",
        description: "Please enter your n8n webhook URL",
        variant: "destructive",
      });
      return;
    }

    localStorage.setItem("n8n_webhook_url", n8nWebhookUrl);
    toast({
      title: "Configuration Saved",
      description: "n8n webhook URL has been saved successfully",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Email Workflows
          </h1>
          <p className="text-gray-600">
            Create and manage automated email campaigns using n8n workflows
          </p>
        </div>

        <Tabs defaultValue="workflows" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="workflows">Workflows</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="workflows" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {workflowTypes.map((workflow) => (
                <Card key={workflow.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-3">
                      <div className={`w-10 h-10 ${workflow.color} rounded-lg flex items-center justify-center`}>
                        <workflow.icon className="h-5 w-5 text-white" />
                      </div>
                      <span>{workflow.name}</span>
                    </CardTitle>
                    <p className="text-sm text-gray-600">{workflow.description}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <Badge variant="outline">Active</Badge>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button size="sm">
                          <Play className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <WorkflowBuilder />
          </TabsContent>

          <TabsContent value="templates">
            <EmailTemplateManager />
          </TabsContent>

          <TabsContent value="analytics">
            <CampaignStats />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>n8n Integration Settings</CardTitle>
                <p className="text-sm text-gray-600">
                  Configure your n8n webhook URL to enable workflow automation
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="n8nWebhook">n8n Webhook URL</Label>
                  <Input
                    id="n8nWebhook"
                    value={n8nWebhookUrl}
                    onChange={(e) => setN8nWebhookUrl(e.target.value)}
                    placeholder="https://your-n8n-instance.com/webhook/your-webhook-id"
                  />
                  <p className="text-xs text-gray-500">
                    Get this URL from your n8n workflow's webhook trigger node
                  </p>
                </div>
                <Button onClick={handleSaveN8nConfig}>
                  Save Configuration
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Email Provider Settings</CardTitle>
                <p className="text-sm text-gray-600">
                  Configure your email provider for sending campaigns
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Provider</Label>
                    <Select defaultValue="resend">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="resend">Resend</SelectItem>
                        <SelectItem value="sendgrid">SendGrid</SelectItem>
                        <SelectItem value="mailgun">Mailgun</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>From Email</Label>
                    <Input placeholder="noreply@yourcompany.com" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
};

export default EmailWorkflows;
