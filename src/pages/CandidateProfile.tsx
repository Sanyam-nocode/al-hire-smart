
import { useState } from "react";
import { Upload, User, MapPin, Mail, Phone, Calendar, CheckCircle, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navbar from "@/components/Navbar";

const CandidateProfile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [profileVisible, setProfileVisible] = useState(true);

  const candidateData = {
    name: "Alex Chen",
    email: "alex.chen@email.com",
    phone: "+1 (555) 123-4567",
    location: "San Francisco, CA",
    title: "Senior Full Stack Developer",
    experience: "5+ years",
    availability: "Available",
    summary: "Experienced full-stack developer with expertise in React ecosystem, Node.js, and cloud architecture. Passionate about building scalable applications and mentoring junior developers.",
    skills: ["React", "Node.js", "TypeScript", "AWS", "GraphQL", "MongoDB", "Docker", "Git"],
    experience_details: [
      {
        company: "TechCorp Inc.",
        position: "Senior Full Stack Developer",
        duration: "2022 - Present",
        description: "Led development of microservices architecture serving 1M+ users. Built React components and APIs."
      },
      {
        company: "StartupXYZ",
        position: "Full Stack Developer",
        duration: "2020 - 2022",
        description: "Developed web applications using React, Node.js, and MongoDB. Implemented CI/CD pipelines."
      }
    ]
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                My Profile
              </h1>
              <p className="text-gray-600">
                Manage your professional profile and visibility settings
              </p>
            </div>
            <Button 
              onClick={() => setIsEditing(!isEditing)}
              variant={isEditing ? "outline" : "default"}
              className={!isEditing ? "bg-gradient-to-r from-purple-600 to-pink-600" : ""}
            >
              <Edit3 className="h-4 w-4 mr-2" />
              {isEditing ? "Cancel" : "Edit Profile"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Visibility Settings */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Visibility Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="profile-visible" className="text-sm font-medium">
                      Profile Visible to Recruiters
                    </Label>
                    <p className="text-xs text-gray-500 mt-1">
                      Allow recruiters to find and contact you
                    </p>
                  </div>
                  <Switch 
                    id="profile-visible"
                    checked={profileVisible}
                    onCheckedChange={setProfileVisible}
                  />
                </div>
                
                {profileVisible && (
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      <span className="text-sm text-green-800 font-medium">Profile is live</span>
                    </div>
                    <p className="text-xs text-green-700 mt-1">
                      Recruiters can discover and contact you
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Profile Views</span>
                  <span className="font-semibold">127</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Recruiter Contacts</span>
                  <span className="font-semibold">8</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Profile Completeness</span>
                  <span className="font-semibold text-green-600">95%</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Profile Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input 
                      id="name" 
                      value={candidateData.name} 
                      disabled={!isEditing}
                      className={!isEditing ? "bg-gray-50" : ""}
                    />
                  </div>
                  <div>
                    <Label htmlFor="title">Professional Title</Label>
                    <Input 
                      id="title" 
                      value={candidateData.title} 
                      disabled={!isEditing}
                      className={!isEditing ? "bg-gray-50" : ""}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={candidateData.email} 
                      disabled={!isEditing}
                      className={!isEditing ? "bg-gray-50" : ""}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input 
                      id="phone" 
                      value={candidateData.phone} 
                      disabled={!isEditing}
                      className={!isEditing ? "bg-gray-50" : ""}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input 
                      id="location" 
                      value={candidateData.location} 
                      disabled={!isEditing}
                      className={!isEditing ? "bg-gray-50" : ""}
                    />
                  </div>
                  <div>
                    <Label htmlFor="availability">Availability</Label>
                    {isEditing ? (
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder={candidateData.availability} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="open">Open to offers</SelectItem>
                          <SelectItem value="not-available">Not available</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input 
                        value={candidateData.availability} 
                        disabled
                        className="bg-gray-50"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="summary">Professional Summary</Label>
                  <Textarea 
                    id="summary" 
                    value={candidateData.summary} 
                    disabled={!isEditing}
                    className={`min-h-[100px] ${!isEditing ? "bg-gray-50" : ""}`}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Skills */}
            <Card>
              <CardHeader>
                <CardTitle>Skills & Technologies</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  {candidateData.skills.map((skill, index) => (
                    <Badge key={index} variant="secondary" className="bg-blue-50 text-blue-700">
                      {skill}
                      {isEditing && (
                        <button className="ml-2 text-blue-500 hover:text-blue-700">×</button>
                      )}
                    </Badge>
                  ))}
                </div>
                
                {isEditing && (
                  <div className="flex gap-2">
                    <Input placeholder="Add a skill..." className="flex-1" />
                    <Button>Add</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Resume Upload */}
            <Card>
              <CardHeader>
                <CardTitle>Resume</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">
                    Current resume: <span className="font-medium">alex_chen_resume.pdf</span>
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    Uploaded 2 weeks ago • AI-parsed for skills
                  </p>
                  {isEditing && (
                    <Button variant="outline">
                      Upload New Resume
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Experience */}
            <Card>
              <CardHeader>
                <CardTitle>Work Experience</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {candidateData.experience_details.map((exp, index) => (
                  <div key={index} className="border-l-4 border-blue-200 pl-4">
                    <h4 className="font-semibold text-gray-900">{exp.position}</h4>
                    <p className="text-blue-600 font-medium">{exp.company}</p>
                    <p className="text-sm text-gray-500 mb-2">{exp.duration}</p>
                    <p className="text-gray-600">{exp.description}</p>
                  </div>
                ))}
                
                {isEditing && (
                  <Button variant="outline" className="w-full">
                    Add Experience
                  </Button>
                )}
              </CardContent>
            </Card>

            {isEditing && (
              <div className="flex gap-4">
                <Button className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600">
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateProfile;
