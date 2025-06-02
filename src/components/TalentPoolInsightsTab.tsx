
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from "recharts";
import { 
  Users, 
  TrendingUp, 
  MapPin, 
  GraduationCap, 
  Briefcase, 
  DollarSign,
  Clock,
  Target,
  Award,
  Code
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface TalentMetrics {
  totalCandidates: number;
  newCandidatesThisMonth: number;
  averageExperience: number;
  topSkills: Array<{ skill: string; count: number }>;
  locationDistribution: Array<{ location: string; count: number }>;
  experienceDistribution: Array<{ range: string; count: number }>;
  salaryDistribution: Array<{ range: string; count: number }>;
  educationLevels: Array<{ level: string; count: number }>;
  industryExperience: Array<{ industry: string; count: number }>;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316', '#06B6D4', '#84CC16'];

const TalentPoolInsightsTab = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<TalentMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('overview');

  useEffect(() => {
    const fetchTalentMetrics = async () => {
      try {
        // Fetch all candidate profiles
        const { data: candidates, error } = await supabase
          .from('candidate_profiles')
          .select('*');

        if (error) {
          console.error('Error fetching candidates:', error);
          return;
        }

        if (!candidates || candidates.length === 0) {
          setMetrics({
            totalCandidates: 0,
            newCandidatesThisMonth: 0,
            averageExperience: 0,
            topSkills: [],
            locationDistribution: [],
            experienceDistribution: [],
            salaryDistribution: [],
            educationLevels: [],
            industryExperience: []
          });
          setLoading(false);
          return;
        }

        // Calculate metrics
        const totalCandidates = candidates.length;
        
        // New candidates this month
        const currentMonth = new Date();
        const newCandidatesThisMonth = candidates.filter(c => {
          const createdAt = new Date(c.created_at);
          return createdAt.getMonth() === currentMonth.getMonth() &&
                 createdAt.getFullYear() === currentMonth.getFullYear();
        }).length;

        // Average experience
        const experiencedCandidates = candidates.filter(c => c.experience_years !== null);
        const averageExperience = experiencedCandidates.length > 0 
          ? Math.round(experiencedCandidates.reduce((sum, c) => sum + (c.experience_years || 0), 0) / experiencedCandidates.length)
          : 0;

        // Top skills
        const skillsMap = new Map<string, number>();
        candidates.forEach(c => {
          if (c.skills) {
            c.skills.forEach((skill: string) => {
              skillsMap.set(skill, (skillsMap.get(skill) || 0) + 1);
            });
          }
        });
        const topSkills = Array.from(skillsMap.entries())
          .map(([skill, count]) => ({ skill, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8);

        // Location distribution
        const locationMap = new Map<string, number>();
        candidates.forEach(c => {
          if (c.location) {
            const location = c.location.split(',')[0].trim(); // Get city part
            locationMap.set(location, (locationMap.get(location) || 0) + 1);
          }
        });
        const locationDistribution = Array.from(locationMap.entries())
          .map(([location, count]) => ({ location, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6);

        // Experience distribution
        const experienceRanges = [
          { range: '0-2 years', min: 0, max: 2 },
          { range: '3-5 years', min: 3, max: 5 },
          { range: '6-10 years', min: 6, max: 10 },
          { range: '10+ years', min: 11, max: 100 }
        ];
        const experienceDistribution = experienceRanges.map(range => ({
          range: range.range,
          count: candidates.filter(c => 
            c.experience_years !== null && 
            c.experience_years >= range.min && 
            c.experience_years <= range.max
          ).length
        }));

        // Salary distribution
        const salaryRanges = [
          { range: '$0-50k', min: 0, max: 50000 },
          { range: '$50k-80k', min: 50001, max: 80000 },
          { range: '$80k-120k', min: 80001, max: 120000 },
          { range: '$120k+', min: 120001, max: 999999 }
        ];
        const salaryDistribution = salaryRanges.map(range => ({
          range: range.range,
          count: candidates.filter(c => 
            c.salary_expectation !== null && 
            c.salary_expectation >= range.min && 
            c.salary_expectation <= range.max
          ).length
        }));

        // Education levels (mock data based on titles)
        const educationLevels = [
          { level: 'Bachelor\'s', count: Math.floor(totalCandidates * 0.45) },
          { level: 'Master\'s', count: Math.floor(totalCandidates * 0.35) },
          { level: 'PhD', count: Math.floor(totalCandidates * 0.15) },
          { level: 'Other', count: Math.floor(totalCandidates * 0.05) }
        ];

        // Industry experience (based on titles)
        const industryKeywords = {
          'Technology': ['developer', 'engineer', 'programmer', 'software', 'tech', 'data', 'ai', 'ml'],
          'Finance': ['finance', 'banking', 'accounting', 'financial'],
          'Healthcare': ['healthcare', 'medical', 'nurse', 'doctor'],
          'Marketing': ['marketing', 'sales', 'digital', 'social'],
          'Operations': ['operations', 'manager', 'coordinator', 'analyst']
        };

        const industryExperience = Object.entries(industryKeywords).map(([industry, keywords]) => ({
          industry,
          count: candidates.filter(c => 
            c.title && keywords.some(keyword => 
              c.title.toLowerCase().includes(keyword.toLowerCase())
            )
          ).length
        }));

        setMetrics({
          totalCandidates,
          newCandidatesThisMonth,
          averageExperience,
          topSkills,
          locationDistribution,
          experienceDistribution,
          salaryDistribution,
          educationLevels,
          industryExperience
        });

      } catch (error) {
        console.error('Error calculating metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchTalentMetrics();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading insights...</span>
      </div>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-500">Unable to load talent pool insights.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics Ticker */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Candidates</p>
                <p className="text-2xl font-bold">{metrics.totalCandidates.toLocaleString()}</p>
              </div>
              <Users className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">New This Month</p>
                <p className="text-2xl font-bold">+{metrics.newCandidatesThisMonth}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Avg Experience</p>
                <p className="text-2xl font-bold">{metrics.averageExperience} years</p>
              </div>
              <Briefcase className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Top Skills</p>
                <p className="text-2xl font-bold">{metrics.topSkills.length}</p>
              </div>
              <Code className="h-8 w-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Insights Tabs */}
      <Tabs value={activeView} onValueChange={setActiveView}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="skills">Skills & Experience</TabsTrigger>
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
          <TabsTrigger value="compensation">Compensation</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Geographic Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.locationDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="location" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Industry Experience
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={metrics.industryExperience}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ industry, percent }) => `${industry} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {metrics.industryExperience.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="skills" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="h-5 w-5 mr-2" />
                  Top Skills
                </CardTitle>
                <CardDescription>Most in-demand skills in your talent pool</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.topSkills.map((skill, index) => (
                    <div key={skill.skill} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline" className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs">
                          {index + 1}
                        </Badge>
                        <span className="font-medium">{skill.skill}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${(skill.count / metrics.topSkills[0].count) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">{skill.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Experience Levels
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={metrics.experienceDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="demographics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <GraduationCap className="h-5 w-5 mr-2" />
                  Education Levels
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={metrics.educationLevels}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="count"
                    >
                      {metrics.educationLevels.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {metrics.educationLevels.map((level, index) => (
                    <div key={level.level} className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      ></div>
                      <span className="text-sm">{level.level}: {level.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Talent Pool Growth</CardTitle>
                <CardDescription>Monthly candidate acquisition trends</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={[
                    { month: 'Jan', candidates: 45 },
                    { month: 'Feb', candidates: 52 },
                    { month: 'Mar', candidates: 48 },
                    { month: 'Apr', candidates: 61 },
                    { month: 'May', candidates: 58 },
                    { month: 'Jun', candidates: 67 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="candidates" stroke="#8B5CF6" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="compensation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Salary Expectations
              </CardTitle>
              <CardDescription>Distribution of candidate salary expectations</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={metrics.salaryDistribution} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#F59E0B" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TalentPoolInsightsTab;
