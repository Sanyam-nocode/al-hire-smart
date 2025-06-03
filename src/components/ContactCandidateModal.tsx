
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Send, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCandidateInteractions } from "@/hooks/useCandidateInteractions";

interface CandidateProfile {
  id: string;
  first_name: string;
  last_name: string;
  title: string | null;
  email: string;
}

interface ContactCandidateModalProps {
  candidate: CandidateProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ContactCandidateModal = ({ candidate, open, onOpenChange }: ContactCandidateModalProps) => {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { addInteraction } = useCandidateInteractions();

  // Set default subject when candidate changes
  useEffect(() => {
    if (candidate) {
      setSubject(`Exciting Opportunity - ${candidate.title || 'Position'} Role`);
      setMessage(`Dear ${candidate.first_name},

I hope this message finds you well. I came across your profile and was impressed by your background and experience.

We have an exciting opportunity that I believe would be a great fit for your skills and career goals. I would love to discuss this position with you in more detail.

Would you be available for a brief conversation this week to explore this opportunity?

Looking forward to hearing from you.

Best regards,`);
    }
  }, [candidate]);

  const handleSendMessage = async () => {
    if (!candidate || !subject.trim() || !message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSending(true);
    
    try {
      console.log("Calling send-candidate-email function with data:", {
        candidate: {
          id: candidate.id,
          name: `${candidate.first_name} ${candidate.last_name}`,
          email: candidate.email,
          title: candidate.title
        },
        email: {
          subject: subject,
          message: message
        }
      });

      // Call backend function to handle email sending and n8n workflow
      const { data, error } = await supabase.functions.invoke('send-candidate-email', {
        body: {
          candidate: {
            id: candidate.id,
            name: `${candidate.first_name} ${candidate.last_name}`,
            email: candidate.email,
            title: candidate.title
          },
          email: {
            subject: subject,
            message: message
          }
        }
      });

      console.log("Edge function response:", { data, error });

      if (error) {
        console.error('Error calling send-candidate-email function:', error);
        toast.error(`Failed to process email: ${error.message || 'Unknown error'}`);
        return;
      }

      if (data?.error) {
        console.error('Edge function returned error:', data.error);
        toast.error(`Failed to process email: ${data.error}`);
        return;
      }

      // Success - email is being handled by n8n workflow
      toast.success(`Email sent successfully to ${candidate.first_name} ${candidate.last_name} via workflow.`);
      
      // Add interaction record for email sent
      console.log("Adding email_sent interaction for candidate:", candidate.id);
      await addInteraction(
        candidate.id,
        'email_sent',
        `Email sent: "${subject}"`,
        {
          subject: subject,
          message: message,
          sentAt: new Date().toISOString(),
          emailMethod: 'n8n_workflow'
        }
      );

      onOpenChange(false);
      
      // Reset form
      setSubject("");
      setMessage("");
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(`Failed to send message: ${error.message || 'Please try again'}`);
    } finally {
      setIsSending(false);
    }
  };

  if (!candidate) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Mail className="h-5 w-5" />
            <span>Contact {candidate.first_name} {candidate.last_name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="to">To:</Label>
            <Input 
              id="to"
              value={`${candidate.first_name} ${candidate.last_name} <${candidate.email}>`}
              readOnly
              className="bg-gray-50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject:</Label>
            <Input 
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message:</Label>
            <Textarea 
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your message"
              rows={10}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              onClick={handleSendMessage} 
              disabled={isSending || !subject.trim() || !message.trim()}
              className="flex-1"
            >
              <Send className="h-4 w-4 mr-2" />
              {isSending ? 'Processing...' : 'Send Message'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSending}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContactCandidateModal;
