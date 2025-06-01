
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Edit } from "lucide-react";
import { ValidationResult } from "@/utils/profileValidation";

interface ProfileCompletionBannerProps {
  validation: ValidationResult;
  onEditProfile: () => void;
}

const ProfileCompletionBanner = ({ validation, onEditProfile }: ProfileCompletionBannerProps) => {
  const { isValid, missingFields, completionPercentage } = validation;

  if (isValid) {
    return (
      <Alert className="bg-green-50 border-green-200">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <span>✅ Your profile is complete! You're now visible to recruiters.</span>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="bg-amber-50 border-amber-200">
      <AlertCircle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-amber-800 font-medium">
            Profile Incomplete ({completionPercentage}% complete)
          </span>
          <Button variant="outline" size="sm" onClick={onEditProfile}>
            <Edit className="h-4 w-4 mr-2" />
            Complete Profile
          </Button>
        </div>
        <Progress value={completionPercentage} className="w-full h-2" />
        <p className="text-amber-700 text-sm">
          Please complete the following mandatory fields to become visible to recruiters:
        </p>
        <ul className="text-amber-700 text-sm list-disc list-inside space-y-1">
          {missingFields.map((field, index) => (
            <li key={index}>{field}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
};

export default ProfileCompletionBanner;
