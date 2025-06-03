
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Mail, Clock, Users, Filter, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WorkflowStep {
  id: string;
  type: "trigger" | "filter" | "delay" | "email" | "action";
  name: string;
  config: Record<string, any>;
}

const WorkflowBuilder = () => {
  const [workflowName, setWorkflowName] = useState("");
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const { toast } = useToast();

  const stepTypes = [
    { type: "trigger", name: "Trigger", icon: Users, description: "When to start the workflow" },
    { type: "filter", name: "Filter", icon: Filter, description: "Filter candidates based on criteria" },
    { type: "delay", name: "Delay", icon: Clock, description: "Wait before next step" },
    { type: "email", name: "Send Email", icon: Mail, description: "Send an email to candidates" },
    { type: "action", name: "Action", icon: Send, description: "Perform an action" }
  ];

  const addStep = (stepType: string) => {
    const newStep: WorkflowStep = {
      id: `step-${Date.now()}`,
      type: stepType as WorkflowStep["type"],
      name: stepTypes.find(s => s.type === stepType)?.name || stepType,
      config: {}
    };
    setWorkflowSteps([...workflowSteps, newStep]);
  };

  const handleSaveWorkflow = async () => {
    if (!workflowName || workflowSteps.length === 0) {
      toast({
        title: "Error",
        description: "Please provide a workflow name and add at least one step",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create n8n workflow payload
      const n8nWorkflow = {
        name: workflowName,
        nodes: workflowSteps.map((step, index) => ({
          id: step.id,
          name: step.name,
          type: step.type,
          position: [100 + (index * 200), 100],
          parameters: step.config
        })),
        connections: workflowSteps.length > 1 ? 
          workflowSteps.slice(0, -1).map((step, index) => ({
            [step.id]: {
              main: [[{ node: workflowSteps[index + 1].id, type: "main", index: 0 }]]
            }
          })).reduce((acc, conn) => ({ ...acc, ...conn }), {}) : {},
        active: true,
        settings: {},
        staticData: {}
      };

      // Get n8n webhook URL from localStorage
      const n8nWebhookUrl = localStorage.getItem("n8n_webhook_url");
      
      if (!n8nWebhookUrl) {
        toast({
          title: "Configuration Required",
          description: "Please configure your n8n webhook URL in settings first",
          variant: "destructive",
        });
        return;
      }

      // Send workflow to n8n
      const response = await fetch(n8nWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "no-cors",
        body: JSON.stringify({
          action: "create_workflow",
          workflow: n8nWorkflow
        }),
      });

      toast({
        title: "Workflow Created",
        description: "Your workflow has been sent to n8n for processing",
      });

      // Reset form
      setWorkflowName("");
      setWorkflowSteps([]);
    } catch (error) {
      console.error("Error creating workflow:", error);
      toast({
        title: "Error",
        description: "Failed to create workflow. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workflow Builder</CardTitle>
        <p className="text-sm text-gray-600">
          Create automated email workflows for candidate outreach and engagement
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="workflowName">Workflow Name</Label>
            <Input
              id="workflowName"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              placeholder="e.g., Senior Developer Outreach Campaign"
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Workflow Steps</h3>
              <div className="flex space-x-2">
                {stepTypes.map((stepType) => (
                  <Button
                    key={stepType.type}
                    variant="outline"
                    size="sm"
                    onClick={() => addStep(stepType.type)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {stepType.name}
                  </Button>
                ))}
              </div>
            </div>

            {workflowSteps.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No workflow steps added yet</p>
                <p className="text-sm">Click on the buttons above to add steps to your workflow</p>
              </div>
            ) : (
              <div className="space-y-3">
                {workflowSteps.map((step, index) => (
                  <div key={step.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                        {index + 1}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">{step.name}</h4>
                        <Badge variant="outline">{step.type}</Badge>
                      </div>
                      <p className="text-sm text-gray-500">
                        {stepTypes.find(s => s.type === step.type)?.description}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      Configure
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline">
              Save as Draft
            </Button>
            <Button onClick={handleSaveWorkflow}>
              Create Workflow
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkflowBuilder;
