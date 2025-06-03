
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Mail, Users, TrendingUp, Clock, CheckCircle, XCircle } from "lucide-react";

const CampaignStats = () => {
  // Mock data for demonstration
  const campaignData = [
    { name: "Jan", sent: 450, opened: 180, clicked: 45, replied: 12 },
    { name: "Feb", sent: 520, opened: 220, clicked: 58, replied: 15 },
    { name: "Mar", sent: 680, opened: 290, clicked: 72, replied: 22 },
    { name: "Apr", sent: 750, opened: 320, clicked: 88, replied: 28 },
    { name: "May", sent: 890, opened: 410, clicked: 105, replied: 35 },
    { name: "Jun", sent: 920, opened: 450, clicked: 115, replied: 42 }
  ];

  const templatePerformance = [
    { name: "Developer Outreach", sent: 1200, opened: 480, rate: 40 },
    { name: "Demo Follow-up", sent: 850, opened: 510, rate: 60 },
    { name: "Senior Role Alert", sent: 950, opened: 380, rate: 35 },
    { name: "Nurture Sequence", sent: 1500, opened: 675, rate: 45 }
  ];

  const workflowStatus = [
    { name: "Active", value: 12, color: "#10B981" },
    { name: "Paused", value: 3, color: "#F59E0B" },
    { name: "Draft", value: 5, color: "#6B7280" },
    { name: "Completed", value: 8, color: "#3B82F6" }
  ];

  const stats = [
    {
      title: "Total Campaigns",
      value: "28",
      change: "+12%",
      icon: Mail,
      color: "text-blue-600"
    },
    {
      title: "Active Workflows",
      value: "12",
      change: "+3",
      icon: TrendingUp,
      color: "text-green-600"
    },
    {
      title: "Total Recipients",
      value: "5,240",
      change: "+18%",
      icon: Users,
      color: "text-purple-600"
    },
    {
      title: "Avg Response Rate",
      value: "3.8%",
      change: "+0.5%",
      icon: CheckCircle,
      color: "text-orange-600"
    }
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Campaign Analytics</h2>
      
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-green-600">{stat.change} from last month</p>
                </div>
                <div className={`p-3 rounded-full bg-gray-100 ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Campaign Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Campaign Performance Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={campaignData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="sent" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  name="Sent"
                />
                <Line 
                  type="monotone" 
                  dataKey="opened" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  name="Opened"
                />
                <Line 
                  type="monotone" 
                  dataKey="replied" 
                  stroke="#F59E0B" 
                  strokeWidth={2}
                  name="Replied"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Workflow Status */}
        <Card>
          <CardHeader>
            <CardTitle>Workflow Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={workflowStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {workflowStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Template Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Email Template Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {templatePerformance.map((template, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium">{template.name}</h4>
                  <p className="text-sm text-gray-600">
                    {template.sent} sent • {template.opened} opened
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm font-medium">{template.rate}% open rate</p>
                    <div className="w-20 h-2 bg-gray-200 rounded-full mt-1">
                      <div 
                        className="h-2 bg-blue-500 rounded-full"
                        style={{ width: `${template.rate}%` }}
                      />
                    </div>
                  </div>
                  <Badge variant={template.rate > 40 ? "default" : "secondary"}>
                    {template.rate > 40 ? "High" : "Average"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Campaign Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { 
                action: "Campaign Started", 
                campaign: "Senior Developer Outreach Q2", 
                time: "2 hours ago",
                status: "active"
              },
              { 
                action: "Workflow Paused", 
                campaign: "Follow-up Sequence #3", 
                time: "5 hours ago",
                status: "paused"
              },
              { 
                action: "Template Updated", 
                campaign: "Demo Booking Reminder", 
                time: "1 day ago",
                status: "updated"
              },
              { 
                action: "Campaign Completed", 
                campaign: "Nurture Series - React Developers", 
                time: "2 days ago",
                status: "completed"
              }
            ].map((activity, index) => (
              <div key={index} className="flex items-center space-x-4 p-3 border-l-4 border-blue-500 bg-blue-50">
                <div className="flex-shrink-0">
                  {activity.status === "active" && <CheckCircle className="h-5 w-5 text-green-500" />}
                  {activity.status === "paused" && <Clock className="h-5 w-5 text-yellow-500" />}
                  {activity.status === "updated" && <TrendingUp className="h-5 w-5 text-blue-500" />}
                  {activity.status === "completed" && <XCircle className="h-5 w-5 text-gray-500" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{activity.action}</p>
                  <p className="text-sm text-gray-600">{activity.campaign}</p>
                </div>
                <div className="text-sm text-gray-500">
                  {activity.time}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CampaignStats;
