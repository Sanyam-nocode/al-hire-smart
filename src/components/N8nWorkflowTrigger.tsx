
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Play, Zap } from 'lucide-react';

const N8nWorkflowTrigger = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    subject: '',
    message: '',
    additionalData: ''
  });

  const n8nWebhookUrl = 'https://sanyam589713.app.n8n.cloud/webhook-test/c935e0a6-0ab5-415d-8e19-2943638f9777';

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const triggerWorkflow = async () => {
    setIsLoading(true);
    console.log('Triggering n8n workflow:', n8nWebhookUrl);
    console.log('Payload:', formData);

    try {
      const payload = {
        ...formData,
        timestamp: new Date().toISOString(),
        source: 'hire-al-platform'
      };

      const response = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('Response status:', response.status);
      
      if (response.ok) {
        const responseData = await response.text();
        console.log('Response data:', responseData);
        
        toast.success('Workflow triggered successfully!', {
          description: 'Your n8n workflow has been executed.'
        });
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error triggering workflow:', error);
      toast.error('Failed to trigger workflow', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-blue-600" />
          N8n Workflow Trigger
        </CardTitle>
        <CardDescription>
          Send data to your n8n workflow webhook
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter email address"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            placeholder="Enter subject"
            value={formData.subject}
            onChange={(e) => handleInputChange('subject', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            placeholder="Enter your message"
            value={formData.message}
            onChange={(e) => handleInputChange('message', e.target.value)}
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="additionalData">Additional Data (JSON format)</Label>
          <Textarea
            id="additionalData"
            placeholder='{"key": "value"}'
            value={formData.additionalData}
            onChange={(e) => handleInputChange('additionalData', e.target.value)}
            rows={3}
          />
        </div>

        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Webhook URL:</p>
          <code className="text-xs bg-white p-2 rounded border block break-all">
            {n8nWebhookUrl}
          </code>
        </div>

        <Button 
          onClick={triggerWorkflow} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Triggering...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Trigger Workflow
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default N8nWorkflowTrigger;
