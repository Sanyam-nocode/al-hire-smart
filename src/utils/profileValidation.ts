
export interface ValidationResult {
  isValid: boolean;
  missingFields: string[];
  completionPercentage: number;
}

export const validateCandidateProfile = (profile: any): ValidationResult => {
  const mandatoryFields = [
    { key: 'first_name', label: 'First Name' },
    { key: 'last_name', label: 'Last Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'location', label: 'Location' },
    { key: 'title', label: 'Current Title' },
    { key: 'experience_years', label: 'Years of Experience' },
    { key: 'summary', label: 'Professional Summary' },
    { key: 'education', label: 'Education' },
    { key: 'linkedin_url', label: 'LinkedIn URL' },
  ];

  const missingFields: string[] = [];
  
  mandatoryFields.forEach(field => {
    const value = profile?.[field.key];
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      missingFields.push(field.label);
    }
  });

  const completionPercentage = Math.round(
    ((mandatoryFields.length - missingFields.length) / mandatoryFields.length) * 100
  );

  return {
    isValid: missingFields.length === 0,
    missingFields,
    completionPercentage
  };
};

export const getProfileCompletionMessage = (missingFields: string[]): string => {
  if (missingFields.length === 0) {
    return "Your profile is complete! You're now visible to recruiters.";
  }
  
  if (missingFields.length === 1) {
    return `Please complete your ${missingFields[0]} to become visible to recruiters.`;
  }
  
  return `Please complete the following fields to become visible to recruiters: ${missingFields.join(', ')}.`;
};
