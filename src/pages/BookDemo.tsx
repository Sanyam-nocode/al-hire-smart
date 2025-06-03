
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BookDemoForm from "@/components/BookDemoForm";

const BookDemo = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Book Your Demo
          </h1>
          <p className="text-xl text-gray-600">
            Schedule a personalized demo to see how Hire Al can transform your recruitment process
          </p>
        </div>
        
        <div className="max-w-2xl mx-auto">
          <BookDemoForm />
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default BookDemo;
