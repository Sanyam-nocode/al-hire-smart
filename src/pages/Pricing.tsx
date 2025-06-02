
import { Check, Star, Users, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Pricing = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Simple, Transparent
              <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Pricing
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Start with a 7-day free trial. Choose the plan that fits your needs.
            </p>
            <div className="inline-flex items-center space-x-2 bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium">
              <Check className="h-4 w-4" />
              <span>7-day free trial • No credit card required</span>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Tabs */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs defaultValue="recruiters" className="space-y-8">
            <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
              <TabsTrigger value="recruiters" className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>For Recruiters</span>
              </TabsTrigger>
              <TabsTrigger value="candidates" className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>For Candidates</span>
              </TabsTrigger>
            </TabsList>

            {/* Recruiter Pricing */}
            <TabsContent value="recruiters">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Recruiter Plans</h2>
                <p className="text-lg text-gray-600">
                  AI-powered candidate search and recruitment tools
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Starter Plan */}
                <Card className="border-2 border-gray-200 hover:border-blue-300 transition-colors">
                  <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold text-gray-900">Starter</CardTitle>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-gray-900">$99</span>
                      <span className="text-gray-600">/month</span>
                    </div>
                    <p className="text-gray-600 mt-2">Perfect for small teams</p>
                    <Badge variant="secondary" className="mt-2">7-day free trial</Badge>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-3">
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span>Up to 100 searches/month</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span>Basic AI ranking</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span>Email templates</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span>Standard support</span>
                      </li>
                    </ul>
                    <Link to="/signup" className="block">
                      <Button className="w-full mt-6" variant="outline">
                        Start Free Trial
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                {/* Professional Plan */}
                <Card className="border-2 border-blue-500 hover:border-blue-600 transition-colors relative">
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center">
                      <Star className="h-4 w-4 mr-1" />
                      Most Popular
                    </span>
                  </div>
                  <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold text-gray-900">Professional</CardTitle>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-gray-900">$299</span>
                      <span className="text-gray-600">/month</span>
                    </div>
                    <p className="text-gray-600 mt-2">For growing companies</p>
                    <Badge variant="secondary" className="mt-2">7-day free trial</Badge>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-3">
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span>Up to 1,000 searches/month</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span>Advanced AI ranking</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span>Personalized outreach</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span>Analytics dashboard</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span>Priority support</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span>Team collaboration</span>
                      </li>
                    </ul>
                    <Link to="/signup" className="block">
                      <Button className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                        Start Free Trial
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                {/* Enterprise Plan */}
                <Card className="border-2 border-gray-200 hover:border-purple-300 transition-colors">
                  <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold text-gray-900">Enterprise</CardTitle>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-gray-900">Custom</span>
                    </div>
                    <p className="text-gray-600 mt-2">For large organizations</p>
                    <Badge variant="secondary" className="mt-2">Custom trial period</Badge>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-3">
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span>Unlimited searches</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span>Custom AI models</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span>Advanced integrations</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span>Dedicated account manager</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span>24/7 support</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span>Custom training</span>
                      </li>
                    </ul>
                    <Button className="w-full mt-6" variant="outline">
                      Contact Sales
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Candidate Pricing */}
            <TabsContent value="candidates">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Candidate Plans</h2>
                <p className="text-lg text-gray-600">
                  Enhanced profile visibility and premium job matching
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Free Plan */}
                <Card className="border-2 border-gray-200 hover:border-green-300 transition-colors">
                  <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold text-gray-900">Basic</CardTitle>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-gray-900">Free</span>
                    </div>
                    <p className="text-gray-600 mt-2">Always free</p>
                    <Badge variant="secondary" className="mt-2">7-day premium trial</Badge>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-3">
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span>Basic profile creation</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span>Resume upload</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span>Limited visibility</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span>Basic job alerts</span>
                      </li>
                    </ul>
                    <Link to="/signup" className="block">
                      <Button className="w-full mt-6" variant="outline">
                        Get Started
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                {/* Premium Plan */}
                <Card className="border-2 border-blue-500 hover:border-blue-600 transition-colors relative">
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center">
                      <Star className="h-4 w-4 mr-1" />
                      Recommended
                    </span>
                  </div>
                  <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold text-gray-900">Premium</CardTitle>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-gray-900">$19</span>
                      <span className="text-gray-600">/month</span>
                    </div>
                    <p className="text-gray-600 mt-2">Enhanced visibility</p>
                    <Badge variant="secondary" className="mt-2">7-day free trial</Badge>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-3">
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span>Priority profile ranking</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span>AI-enhanced profile</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span>Advanced job matching</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span>Direct recruiter contact</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span>Priority support</span>
                      </li>
                    </ul>
                    <Link to="/signup" className="block">
                      <Button className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                        Start Free Trial
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                {/* Pro Plan */}
                <Card className="border-2 border-gray-200 hover:border-purple-300 transition-colors">
                  <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold text-gray-900">Pro</CardTitle>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-gray-900">$39</span>
                      <span className="text-gray-600">/month</span>
                    </div>
                    <p className="text-gray-600 mt-2">Maximum exposure</p>
                    <Badge variant="secondary" className="mt-2">7-day free trial</Badge>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-3">
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span>Top profile placement</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span>Personal branding tools</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span>Interview preparation</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span>Salary insights</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span>Dedicated support</span>
                      </li>
                    </ul>
                    <Link to="/signup" className="block">
                      <Button className="w-full mt-6" variant="outline">
                        Start Free Trial
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Pricing;
