import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, Calendar, Star, Shield, Clock, Users, 
  Hammer, Wrench, Scissors, MapPin, Check, 
  Instagram, Facebook, Twitter, MessageCircle,
  Send, X, ExternalLink
} from 'lucide-react';

const slideImages = [
  {
    url: 'https://images.pexels.com/photos/5691616/pexels-photo-5691616.jpeg?auto=compress&cs=tinysrgb&w=1200',
    alt: 'Carpenter working with timber in workshop'
  },
  {
    url: 'https://images.pexels.com/photos/8486944/pexels-photo-8486944.jpeg?auto=compress&cs=tinysrgb&w=1200',
    alt: 'Electrician working on electrical installation'
  },
  {
    url: 'https://images.pexels.com/photos/6069112/pexels-photo-6069112.jpeg?auto=compress&cs=tinysrgb&w=1200',
    alt: 'Fashion designer stitching beautiful fabric'
  },
  {
    url: 'https://images.pexels.com/photos/3964704/pexels-photo-3964704.jpeg?auto=compress&cs=tinysrgb&w=1200',
    alt: 'Mechanic working on motorcycle'
  },
  {
    url: 'https://images.pexels.com/photos/5691617/pexels-photo-5691617.jpeg?auto=compress&cs=tinysrgb&w=1200',
    alt: 'Bricklayer building walls with clay bricks'
  }
];

export function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showTerms, setShowTerms] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slideImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm border-b relative z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="relative">
                <img 
                  src="/src/assets/Logo.png" 
                  alt="FundiConnect Logo" 
                  className="w-12 h-12 object-contain hover:scale-105 transition-transform"
                />
              </div>
              <div>
                <span className="text-xl font-bold text-gray-900">FundiConnect</span>
                <div className="text-xs text-orange-600 font-medium">Skilled Hands Across Africa</div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#discover" className="text-gray-700 hover:text-orange-600 transition-colors font-medium">
                Search & Discover
              </a>
              <a href="#book" className="text-gray-700 hover:text-orange-600 transition-colors font-medium">
                Book Instantly
              </a>
              <a href="#review" className="text-gray-700 hover:text-orange-600 transition-colors font-medium">
                Rate & Review
              </a>
              <Link
                to="/signup"
                className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition-colors font-medium"
              >
                Join Now
              </Link>
            </nav>

            {/* Mobile menu button */}
            <button className="md:hidden p-2">
              <div className="w-6 h-6 flex flex-col justify-center space-y-1">
                <div className="w-full h-0.5 bg-gray-600"></div>
                <div className="w-full h-0.5 bg-gray-600"></div>
                <div className="w-full h-0.5 bg-gray-600"></div>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section with Slideshow */}
      <section className="relative h-screen overflow-hidden">
        {/* Slideshow Background */}
        <div className="absolute inset-0">
          {slideImages.map((image, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === currentSlide ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <img
                src={image.url}
                alt={image.alt}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-40"></div>
            </div>
          ))}
        </div>

        {/* Hero Content */}
        <div className="relative z-10 h-full flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Skilled Hands,
              <span className="text-orange-400 block">Trusted Across Africa</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-200 mb-12 max-w-4xl mx-auto leading-relaxed">
              Find, Book, and Trust Fundis — from Nairobi to Lagos, Accra to Kigali.
              <br className="hidden md:block" />
              Connect with verified skilled professionals in your neighborhood.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                to="/signup?role=client"
                className="bg-orange-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-orange-700 transition-all transform hover:scale-105 text-lg shadow-lg"
              >
                Find a Fundi
              </Link>
              <Link
                to="/signup?role=fundi"
                className="bg-white text-orange-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-all transform hover:scale-105 text-lg shadow-lg"
              >
                Become a Fundi
              </Link>
              <Link
                to="/signup?role=agent"
                className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-orange-600 transition-all transform hover:scale-105 text-lg"
              >
                Join as an Agent
              </Link>
            </div>
          </div>
        </div>

        {/* Slide Indicators */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2">
          {slideImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentSlide ? 'bg-orange-500 scale-125' : 'bg-white bg-opacity-50'
              }`}
            />
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="discover" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">
              How FundiConnect Works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Simple, secure, and efficient way to connect with skilled professionals across Africa
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {/* Search & Discover */}
            <div className="text-center group">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Search className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">Search & Discover</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Find fundis by region, country, state, city, and exact location. 
                Search by skill type: Electrician, Tailor, Carpenter, or any custom skill tag.
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex flex-wrap gap-2 justify-center">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">Nairobi</span>
                  <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">Electrician</span>
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full">Lagos</span>
                  <span className="px-3 py-1 bg-orange-100 text-orange-800 text-sm rounded-full">Tailor</span>
                </div>
              </div>
            </div>

            {/* Book Instantly */}
            <div className="text-center group" id="book">
              <div className="bg-gradient-to-br from-green-500 to-green-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Calendar className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">Book Instantly</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                View real-time availability and book appointments with instant confirmations. 
                Schedule services that fit your timeline perfectly.
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-center space-x-2 text-sm">
                  <Clock className="h-4 w-4 text-green-600" />
                  <span className="text-green-600 font-medium">Available Today</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-600">2:00 PM - 6:00 PM</span>
                </div>
              </div>
            </div>

            {/* Rate & Review */}
            <div className="text-center group" id="review">
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Star className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">Rate & Review</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Rate fundis after service completion (1-5 stars). Fundis also rate clients. 
                Build trust through transparent feedback.
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-center space-x-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-4 w-4 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-sm text-gray-600">"Excellent work, very professional!"</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">
              Simple Plans That Work For Everyone
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Transparent pricing in your local currency with flexible payment options
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Fundi Plans */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-transparent hover:border-orange-200 transition-all">
              <div className="text-center mb-8">
                <Hammer className="h-12 w-12 text-orange-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">For Fundis</h3>
                <p className="text-gray-600">Grow your business and reach more clients</p>
              </div>

              <div className="space-y-6">
                <div className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-900">Free Plan</span>
                    <span className="text-green-600 font-bold">$0/month</span>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Limited listings</li>
                    <li>• Basic profile</li>
                    <li>• Standard support</li>
                  </ul>
                </div>

                <div className="border-2 border-orange-200 rounded-lg p-4 bg-orange-50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-900">Premium</span>
                    <span className="text-orange-600 font-bold">$2/month</span>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li className="flex items-center"><Check className="h-3 w-3 text-green-500 mr-1" /> Priority visibility</li>
                    <li className="flex items-center"><Check className="h-3 w-3 text-green-500 mr-1" /> Trust score badge</li>
                    <li className="flex items-center"><Check className="h-3 w-3 text-green-500 mr-1" /> WhatsApp alerts</li>
                    <li className="flex items-center"><Check className="h-3 w-3 text-green-500 mr-1" /> Analytics dashboard</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Client Plans */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-transparent hover:border-blue-200 transition-all">
              <div className="text-center mb-8">
                <Users className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">For Clients</h3>
                <p className="text-gray-600">Find and book the best fundis</p>
              </div>

              <div className="space-y-6">
                <div className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-900">Free Plan</span>
                    <span className="text-green-600 font-bold">$0/month</span>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Free to book</li>
                    <li>• Basic search</li>
                    <li>• Standard support</li>
                  </ul>
                </div>

                <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-900">Premium</span>
                    <span className="text-blue-600 font-bold">$1/month</span>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li className="flex items-center"><Check className="h-3 w-3 text-green-500 mr-1" /> Bonus loyalty points</li>
                    <li className="flex items-center"><Check className="h-3 w-3 text-green-500 mr-1" /> Top-rated fundis only</li>
                    <li className="flex items-center"><Check className="h-3 w-3 text-green-500 mr-1" /> Priority booking</li>
                    <li className="flex items-center"><Check className="h-3 w-3 text-green-500 mr-1" /> 24/7 support</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="mt-16 text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              Pay with your preferred method
            </h3>
            <div className="flex flex-wrap justify-center items-center gap-6 opacity-70">
              <div className="bg-white px-4 py-2 rounded-lg shadow">
                <span className="text-green-600 font-bold">M-Pesa</span>
              </div>
              <div className="bg-white px-4 py-2 rounded-lg shadow">
                <span className="text-blue-600 font-bold">Paystack</span>
              </div>
              <div className="bg-white px-4 py-2 rounded-lg shadow">
                <span className="text-purple-600 font-bold">Flutterwave</span>
              </div>
              <div className="bg-white px-4 py-2 rounded-lg shadow">
                <span className="text-yellow-600 font-bold">MTN MoMo</span>
              </div>
              <div className="bg-white px-4 py-2 rounded-lg shadow">
                <span className="text-red-600 font-bold">Vodafone Cash</span>
              </div>
              <div className="bg-white px-4 py-2 rounded-lg shadow">
                <span className="text-orange-600 font-bold">Airtel Money</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Contact Section */}
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <img 
                  src="/src/assets/Logo.png" 
                  alt="FundiConnect Logo" 
                  className="w-10 h-10 object-contain"
                />
                <span className="text-2xl font-bold">FundiConnect</span>
              </div>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
                    <span className="text-orange-400">@</span>
                  </div>
                  <span>info@fundiconnect.com</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
                    <span className="text-green-400">📞</span>
                  </div>
                  <span>+2347058363333</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
                    <MessageCircle className="h-4 w-4 text-blue-400" />
                  </div>
                  <span>chat.fundi.ai</span>
                </div>
              </div>

              {/* Social Icons */}
              <div className="flex space-x-4">
                <a href="#" className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center hover:scale-110 transition-transform">
                  <Instagram className="h-5 w-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center hover:scale-110 transition-transform">
                  <MessageCircle className="h-5 w-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center hover:scale-110 transition-transform">
                  <Facebook className="h-5 w-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-black rounded-lg flex items-center justify-center hover:scale-110 transition-transform">
                  <Twitter className="h-5 w-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center hover:scale-110 transition-transform">
                  <Send className="h-5 w-5" />
                </a>
              </div>
            </div>

            {/* Payment Partners */}
            <div>
              <h3 className="text-lg font-semibold mb-6">Payment Partners</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-800 p-3 rounded-lg text-center">
                  <div className="text-green-400 font-bold text-sm">M-Pesa</div>
                </div>
                <div className="bg-gray-800 p-3 rounded-lg text-center">
                  <div className="text-blue-400 font-bold text-sm">Paystack</div>
                </div>
                <div className="bg-gray-800 p-3 rounded-lg text-center">
                  <div className="text-purple-400 font-bold text-sm">Flutterwave</div>
                </div>
                <div className="bg-gray-800 p-3 rounded-lg text-center">
                  <div className="text-yellow-400 font-bold text-sm">MTN MoMo</div>
                </div>
                <div className="bg-gray-800 p-3 rounded-lg text-center">
                  <div className="text-red-400 font-bold text-sm">Vodafone</div>
                </div>
                <div className="bg-gray-800 p-3 rounded-lg text-center">
                  <div className="text-orange-400 font-bold text-sm">Airtel</div>
                </div>
              </div>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-lg font-semibold mb-6">Legal</h3>
              <div className="space-y-3">
                <button
                  onClick={() => setShowTerms(true)}
                  className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
                >
                  <span>Terms & Conditions</span>
                  <ExternalLink className="h-4 w-4" />
                </button>
                <a href="#" className="block text-gray-300 hover:text-white transition-colors">
                  Privacy Policy
                </a>
                <a href="#" className="block text-gray-300 hover:text-white transition-colors">
                  Cookie Policy
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2024 FundiConnect. All rights reserved. Connecting skilled hands across Africa.</p>
          </div>
        </div>
      </footer>

      {/* Terms Modal */}
      {showTerms && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">Terms & Conditions</h2>
              <button
                onClick={() => setShowTerms(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">1. General Use</h3>
                <p className="text-gray-700 leading-relaxed">
                  FundiConnect is a digital platform that connects clients with reliable skilled workers ("Fundis") across African regions. 
                  All users are required to provide accurate personal and regional location data to improve match quality and trust. 
                  Users agree to transact, communicate, and review through the platform for safety and transparency.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">2. Fundis</h3>
                <ul className="text-gray-700 space-y-2 leading-relaxed">
                  <li>• Must register their skills and location honestly</li>
                  <li>• May customize and input additional services not listed during onboarding</li>
                  <li>• Required to respond to bookings within 1 hour</li>
                  <li>• If a fundi <strong>cancels 3 bookings consecutively</strong>, FundiConnect may flag the account, temporarily limit visibility, or notify them via email/WhatsApp</li>
                  <li>• Fundis are rated by clients and maintain a trust score. Low trust scores may reduce visibility or require re-verification</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">3. Clients</h3>
                <ul className="text-gray-700 space-y-2 leading-relaxed">
                  <li>• Must request services sincerely and provide accurate address and time availability</li>
                  <li>• No-shows and late cancellations (under 2 hours before job time) <strong>more than 3 times</strong> may result in reduced access to premium fundis or temporary account freeze</li>
                  <li>• Clients are also rated by fundis</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">4. Payments & Subscriptions</h3>
                <ul className="text-gray-700 space-y-2 leading-relaxed">
                  <li>• FundiConnect offers subscription-based access for premium services</li>
                  <li>• Subscription payments are converted to the user's local currency and processed through regional partners</li>
                  <li>• All transactions are secure and monitored by FundiConnect</li>
                  <li>• Refunds are only eligible through the Dispute Resolution flow</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">5. Loyalty Program</h3>
                <ul className="text-gray-700 space-y-2 leading-relaxed">
                  <li>• Clients and fundis receive points for every completed, non-disputed job</li>
                  <li>• Every 5 successful jobs = bonus visibility or discounted subscriptions</li>
                  <li>• Points expire after 6 months if unused</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">6. Disputes</h3>
                <ul className="text-gray-700 space-y-2 leading-relaxed">
                  <li>• Clients/fundis can raise disputes within 24hrs of service</li>
                  <li>• FundiConnect will investigate via chat logs, location/time data, and user feedback</li>
                  <li>• Resolutions may include partial refunds, mediation, or user warnings/suspension</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">7. FundiConnect Platform Rights</h3>
                <ul className="text-gray-700 space-y-2 leading-relaxed">
                  <li>• FundiConnect may suspend accounts involved in fraudulent behavior, repeated no-shows, or discrimination</li>
                  <li>• FundiConnect retains the right to select and modify default payment methods for optimal regional delivery</li>
                  <li>• FundiConnect reserves the right to adjust subscription plans and loyalty policies in line with platform scaling</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}