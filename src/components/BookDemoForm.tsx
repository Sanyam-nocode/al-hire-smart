
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Clock, Users, Video, CheckCircle, Star, ArrowRight } from "lucide-react";
import { format, addDays, isSameDay, isAfter, isBefore } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const BookDemoForm = () => {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    title: "",
    teamSize: "",
    currentProcess: "",
    specificNeeds: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const timeSlots = [
    "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
    "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM",
    "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM", "05:00 PM"
  ];

  const teamSizeOptions = [
    "1-5 people",
    "6-20 people", 
    "21-50 people",
    "51-200 people",
    "200+ people"
  ];

  const currentProcessOptions = [
    "Manual sourcing",
    "Traditional job boards",
    "Recruiting agencies",
    "Other AI tools",
    "Mixed approach"
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const triggerN8nWorkflow = async (bookingData: any) => {
    const n8nWebhookUrl = "https://sanyam589713.app.n8n.cloud/webhook/849193ea-1080-4eb9-b46d-2c2bb7a090da";
    
    try {
      console.log("Triggering n8n workflow for demo booking:", n8nWebhookUrl);
      
      const workflowData = {
        timestamp: new Date().toISOString(),
        triggered_from: "hire_ai_book_demo",
        booking: bookingData
      };

      console.log("Sending workflow data:", JSON.stringify(workflowData, null, 2));

      const response = await fetch(n8nWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(workflowData),
      });

      console.log("n8n response status:", response.status);
      const responseText = await response.text();
      console.log("n8n response body:", responseText);

      if (!response.ok) {
        throw new Error(`n8n webhook failed with status ${response.status}: ${responseText}`);
      }

      console.log("n8n workflow triggered successfully for demo booking");
      return { success: true, message: "Workflow triggered successfully" };
    } catch (error) {
      console.error("Error triggering n8n workflow:", error);
      return { success: false, error: error.message };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate || !selectedTime) {
      toast({
        title: "Missing Information",
        description: "Please select both date and time for your demo.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Save booking to database
      const { data: booking, error: bookingError } = await supabase
        .from('demo_bookings')
        .insert({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          company: formData.company,
          job_title: formData.title,
          team_size: formData.teamSize,
          current_process: formData.currentProcess,
          specific_needs: formData.specificNeeds,
          demo_date: format(selectedDate, "yyyy-MM-dd"),
          demo_time: selectedTime,
          timezone: 'EST'
        })
        .select()
        .single();

      if (bookingError) {
        console.error('Error saving booking:', bookingError);
        throw new Error('Failed to save booking');
      }

      // Trigger n8n workflow for demo booking
      console.log("Triggering n8n workflow for demo booking");
      const workflowResult = await triggerN8nWorkflow({
        id: booking.id,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        company: formData.company,
        jobTitle: formData.title,
        teamSize: formData.teamSize,
        currentProcess: formData.currentProcess,
        specificNeeds: formData.specificNeeds,
        demoDate: format(selectedDate, "yyyy-MM-dd"),
        demoTime: selectedTime,
        timezone: 'EST'
      });

      console.log("n8n workflow result:", workflowResult);

      // Check if n8n workflow was successful before showing success message
      if (!workflowResult.success) {
        throw new Error('Failed to trigger notification workflow');
      }

      // Call the edge function to generate meeting URL (but don't rely on it for success message)
      const { error: emailError } = await supabase.functions.invoke('send-demo-invite', {
        body: {
          bookingId: booking.id,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          company: formData.company,
          demoDate: format(selectedDate, "yyyy-MM-dd"),
          demoTime: selectedTime,
          timezone: 'EST'
        }
      });

      if (emailError) {
        console.error('Error calling demo invite function:', emailError);
      }

      // Show success message only after n8n workflow is triggered successfully
      toast({
        title: "Demo Booked Successfully!",
        description: `Your demo is scheduled for ${format(selectedDate, "MMMM d, yyyy")} at ${selectedTime}. Check your email for confirmation and calendar invite.`,
      });
      
      // Reset form
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        company: "",
        title: "",
        teamSize: "",
        currentProcess: "",
        specificNeeds: ""
      });
      setSelectedDate(undefined);
      setSelectedTime("");
    } catch (error) {
      console.error('Error booking demo:', error);
      toast({
        title: "Booking Failed",
        description: "There was an error booking your demo. Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    const maxDate = addDays(today, 30);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    
    return isBefore(date, today) || isAfter(date, maxDate) || isWeekend;
  };

  const demoFeatures = [
    "AI-powered natural language search",
    "Multi-platform candidate sourcing",
    "Automated candidate ranking",
    "Personalized outreach generation",
    "Integration capabilities",
    "Analytics and reporting"
  ];

  const benefits = [
    { icon: Clock, title: "Save 80% Time", description: "Reduce manual sourcing time dramatically" },
    { icon: Users, title: "Better Matches", description: "Find candidates that perfectly fit your requirements" },
    { icon: Star, title: "Higher Response", description: "Personalized outreach gets 3x more responses" }
  ];

  return (
    <div className="space-y-6">
      {/* Demo Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Video className="h-5 w-5" />
            <span>Book Your Personalized Demo</span>
          </CardTitle>
          <p className="text-gray-600">
            Schedule a 30-minute demo to see how Hire Al can transform your recruitment process
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <benefit.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold mb-2">{benefit.title}</h3>
                <p className="text-sm text-gray-600">{benefit.description}</p>
              </div>
            ))}
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold mb-3">What you'll see in the demo:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {demoFeatures.map((feature, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Your Information</CardTitle>
            <p className="text-sm text-gray-600">Tell us about yourself and your recruitment needs</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange("firstName", e.target.value)}
                  placeholder="John"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange("lastName", e.target.value)}
                  placeholder="Doe"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Work Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="john.doe@company.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => handleInputChange("company", e.target.value)}
                placeholder="Your Company Name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Job Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="e.g., Head of Talent, Recruiter"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="teamSize">Team Size</Label>
              <Select value={formData.teamSize} onValueChange={(value) => handleInputChange("teamSize", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team size" />
                </SelectTrigger>
                <SelectContent>
                  {teamSizeOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentProcess">Current Recruiting Process</Label>
              <Select value={formData.currentProcess} onValueChange={(value) => handleInputChange("currentProcess", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="How do you currently recruit?" />
                </SelectTrigger>
                <SelectContent>
                  {currentProcessOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="specificNeeds">Specific Needs or Questions</Label>
              <Textarea
                id="specificNeeds"
                value={formData.specificNeeds}
                onChange={(e) => handleInputChange("specificNeeds", e.target.value)}
                placeholder="Tell us about your recruitment challenges or specific features you're interested in..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Schedule Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Choose Date & Time</CardTitle>
            <p className="text-sm text-gray-600">Select a convenient time for your 30-minute demo</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Select Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={isDateDisabled}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-gray-500">Available Monday-Friday, next 30 days</p>
            </div>

            {selectedDate && (
              <div className="space-y-2">
                <Label>Select Time (EST)</Label>
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                  {timeSlots.map((time) => (
                    <Button
                      key={time}
                      variant={selectedTime === time ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedTime(time)}
                      className={cn(
                        selectedTime === time && "bg-gradient-to-r from-blue-600 to-purple-600"
                      )}
                    >
                      {time}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {selectedDate && selectedTime && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm font-medium text-green-800">
                  Demo Scheduled for:
                </p>
                <p className="text-sm text-green-600">
                  {format(selectedDate, "EEEE, MMMM d, yyyy")} at {selectedTime} EST
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Button
                type="submit"
                disabled={isSubmitting || !selectedDate || !selectedTime || !formData.firstName || !formData.lastName || !formData.email || !formData.company}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Booking Demo...
                  </>
                ) : (
                  <>
                    Book Demo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="text-center text-xs text-gray-500">
              <p>You'll receive a calendar invite and join link via email</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle>What to Expect</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                1
              </div>
              <h4 className="font-medium mb-1">Demo Preparation</h4>
              <p className="text-sm text-gray-600">We'll prepare a personalized demo based on your company and needs</p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                2
              </div>
              <h4 className="font-medium mb-1">Live Demo</h4>
              <p className="text-sm text-gray-600">30-minute interactive session showing how Hire Al works for your use case</p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                3
              </div>
              <h4 className="font-medium mb-1">Next Steps</h4>
              <p className="text-sm text-gray-600">Discuss pricing, implementation timeline, and trial access</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BookDemoForm;
