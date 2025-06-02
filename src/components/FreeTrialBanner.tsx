
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, X, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FreeTrialBannerProps {
  userType: 'recruiter' | 'candidate';
}

const FreeTrialBanner = ({ userType }: FreeTrialBannerProps) => {
  const { user } = useAuth();
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const calculateTrialDays = async () => {
      if (!user) return;

      try {
        // Get user creation date (trial start date)
        const { data: authUser, error } = await supabase.auth.getUser();
        
        if (error || !authUser.user) {
          console.error('Error fetching user:', error);
          setIsLoading(false);
          return;
        }

        const createdAt = new Date(authUser.user.created_at);
        const now = new Date();
        const daysSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
        const remainingDays = Math.max(0, 7 - daysSinceCreation);

        console.log('Free trial calculation:', {
          createdAt,
          daysSinceCreation,
          remainingDays
        });

        setDaysLeft(remainingDays);
        setIsLoading(false);

        // Auto-hide banner if trial has expired
        if (remainingDays === 0) {
          setTimeout(() => setIsVisible(false), 5000);
        }
      } catch (error) {
        console.error('Error calculating trial days:', error);
        setIsLoading(false);
      }
    };

    calculateTrialDays();
  }, [user]);

  const handleUpgrade = () => {
    toast.info("Redirecting to pricing...");
    // In a real app, this would navigate to the pricing page or payment flow
    window.location.href = '/pricing';
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (isLoading || !isVisible || daysLeft === null) {
    return null;
  }

  const isExpired = daysLeft === 0;
  const isLastDay = daysLeft === 1;

  return (
    <Card className={`mb-6 border-2 ${
      isExpired 
        ? 'border-red-500 bg-red-50' 
        : isLastDay 
          ? 'border-orange-500 bg-orange-50' 
          : 'border-blue-500 bg-blue-50'
    }`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full ${
              isExpired 
                ? 'bg-red-100' 
                : isLastDay 
                  ? 'bg-orange-100' 
                  : 'bg-blue-100'
            }`}>
              {isExpired ? (
                <X className={`h-5 w-5 text-red-600`} />
              ) : (
                <Clock className={`h-5 w-5 ${
                  isLastDay ? 'text-orange-600' : 'text-blue-600'
                }`} />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <h3 className={`font-semibold ${
                  isExpired 
                    ? 'text-red-800' 
                    : isLastDay 
                      ? 'text-orange-800' 
                      : 'text-blue-800'
                }`}>
                  {isExpired ? 'Free Trial Expired' : 'Free Trial Active'}
                </h3>
              </div>
              <p className={`text-sm ${
                isExpired 
                  ? 'text-red-700' 
                  : isLastDay 
                    ? 'text-orange-700' 
                    : 'text-blue-700'
              }`}>
                {isExpired 
                  ? `Your 7-day free trial has ended. Upgrade now to continue using ${userType === 'recruiter' ? 'AI-powered candidate search' : 'premium job matching features'}.`
                  : `You have ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left in your free trial. Enjoy full access to all ${userType === 'recruiter' ? 'recruiting' : 'job search'} features!`
                }
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isExpired || isLastDay ? (
              <Button 
                onClick={handleUpgrade}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                Upgrade Now
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" onClick={handleDismiss}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FreeTrialBanner;
