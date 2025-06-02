
import { Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
            <div className="inline-flex items-center px-4 py-2 bg-green-100 rounded-full text-green-700 text-sm font-medium mb-6">
              <Star className="h-4 w-4 mr-2" />
              14-Day Free Trial for All Plans
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Simple, Transparent
              <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Pricing
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Choose the plan that fits your needs. Start with a free 14-day trial, no credit card required.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Tabs */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs defaultValue="recruiter" className="w-full">
            <div className="flex justify-center mb-12">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="recruiter">For Recruiters</TabsTrigger>
                <TabsTrigger value="candidate">For Candidates</TabsTrigger>
              </TabsList>
            </div>

            {/* Recruiter Pricing */}
            <TabsContent value="recruiter">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Starter Plan */}
                <Card className="border-2 border-gray-200 hover:border-blue-300 transition-colors">
                  <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold text-gray-900">Starter</CardTitle>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-gray-900">$79</span>
                      <span className="text-gray-600">/month</span>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-800 mt-2">
                      14-Day Free Trial
                    </Badge>
                    <p className="text-gray-600 mt-2">Perfect for small recruiting teams</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-3">
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span>Up to 50 searches/month</span>
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
                      <span className="text-4xl font-bold text-gray-900">$199</span>
                      <span className="text-gray-600">/month</span>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-800 mt-2">
                      14-Day Free Trial
                    </Badge>
                    <p className="text-gray-600 mt-2">For growing companies</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-3">
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span>Up to 500 searches/month</span>
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
                    <Badge variant="secondary" className="bg-green-100 text-green-800 mt-2">
                      14-Day Free Trial
                    </Badge>
                    <p className="text-gray-600 mt-2">For large organizations</p>
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
            <TabsContent value="candidate">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Free Plan */}
                <Card className="border-2 border-gray-200 hover:border-green-300 transition-colors">
                  <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold text-gray-900">Free</CardTitle>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-gray-900">$0</span>
                      <span className="text-gray-600">/month</span>
                    </div>
                    <p className="text-gray-600 mt-2">Basic profile visibility</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-3">
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span>Basic profile creation</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span>Limited visibility to recruiters</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span>Resume upload</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span>Basic skill extraction</span>
                      </li>
                    </ul>
                    <Link to="/signup" className="block">
                      <Button className="w-full mt-6" variant="outline">
                        Get Started Free
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                {/* Premium Plan */}
                <Card className="border-2 border-purple-500 hover:border-purple-600 transition-colors relative">
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center">
                      <Star className="h-4 w-4 mr-1" />
                      Most Popular
                    </span>
                  </div>
                  <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold text-gray-900">Premium</CardTitle>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-gray-900">$29</span>
                      <span className="text-gray-600">/month</span>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-800 mt-2">
                      14-Day Free Trial
                    </Badge>
                    <p className="text-gray-600 mt-2">Enhanced profile & visibility</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-3">
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span>Enhanced profile visibility</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span>Priority in search results</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span>Advanced AI profile optimization</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span>Direct message alerts</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span>Interview preparation tools</span>
                      </li>
                    </ul>
                    <Link to="/signup" className="block">
                      <Button className="w-full mt-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                        Start Free Trial
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                {/* Pro Plan */}
                <Card className="border-2 border-gray-200 hover:border-pink-300 transition-colors">
                  <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold text-gray-900">Pro</CardTitle>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-gray-900">$59</span>
                      <span className="text-gray-600">/month</span>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-800 mt-2">
                      14-Day Free Trial
                    </Badge>
                    <p className="text-gray-600 mt-2">Maximum visibility & features</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-3">
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span>Maximum profile visibility</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span>Featured in top search results</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span>Personal career advisor</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span>Salary negotiation guidance</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span>Priority support</span>
                      </li>
                    </ul>
                    <Link to="/signup" className="block">
                      <Button className="w-full mt-6 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700">
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
