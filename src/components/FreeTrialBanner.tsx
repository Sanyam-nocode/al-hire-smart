
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, X, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';

interface FreeTrialBannerProps {
  userType: 'recruiter' | 'candidate';
  daysRemaining?: number;
}

const FreeTrialBanner = ({ userType, daysRemaining = 14 }: FreeTrialBannerProps) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const isRecruiter = userType === 'recruiter';
  const bgColor = isRecruiter ? 'bg-gradient-to-r from-blue-50 to-purple-50' : 'bg-gradient-to-r from-purple-50 to-pink-50';
  const textColor = isRecruiter ? 'text-blue-900' : 'text-purple-900';
  const badgeColor = isRecruiter ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800';

  return (
    <Card className={`border-0 shadow-sm ${bgColor} mb-6`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full ${isRecruiter ? 'bg-blue-100' : 'bg-purple-100'}`}>
              <Clock className={`h-5 w-5 ${isRecruiter ? 'text-blue-600' : 'text-purple-600'}`} />
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <Badge variant="secondary" className={badgeColor}>
                  Free Trial Active
                </Badge>
                <span className={`text-sm font-medium ${textColor}`}>
                  {daysRemaining} days remaining
                </span>
              </div>
              <p className={`text-sm ${textColor}`}>
                You're currently on a 14-day free trial. Upgrade to continue enjoying all features after your trial ends.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Link to="/pricing">
              <Button size="sm" className={isRecruiter ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}>
                <CreditCard className="h-4 w-4 mr-1" />
                View Plans
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
              className={`${textColor} hover:bg-white/50`}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FreeTrialBanner;
