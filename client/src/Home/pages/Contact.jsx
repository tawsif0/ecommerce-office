import React, { useState } from "react";
import {
  FiMapPin,
  FiPhone,
  FiClock,
  FiMail,
  FiSend,
  FiCheckCircle,
  FiUser,
  FiMessageSquare,
  FiInstagram,
  FiTwitter,
  FiFacebook,
  FiLinkedin,
} from "react-icons/fi";
import { FaWhatsapp, FaTelegramPlane } from "react-icons/fa";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
      });

      // Reset success message after 5 seconds
      setTimeout(() => setIsSubmitted(false), 5000);
    }, 1500);
  };

  return (
    <section className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-white opacity-5"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-15 relative">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-black mb-4 tracking-tight">
              Get In{" "}
              <span className="bg-linear-to-r from-gray-800 to-black bg-clip-text text-transparent">
                Touch
              </span>
            </h1>
            <p className="text-gray-600 text-base md:text-lg max-w-2xl mx-auto mb-8">
              We'd love to hear from you. Whether you have a question about
              features, pricing, need a demo, or anything else, our team is
              ready to answer all your questions.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-12 md:mb-20">
          {/* Left Column - Contact Form */}
          <div className="space-y-8">
            <div className="bg-linear-to-br from-white to-gray-50 rounded-3xl p-6 md:p-8 border border-gray-200 shadow-xl">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center">
                  <FiMessageSquare className="text-xl text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-black">
                    Send us a message
                  </h2>
                  <p className="text-gray-600">
                    We typically respond within 2 hours
                  </p>
                </div>
              </div>

              {isSubmitted ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                    <FiCheckCircle className="text-4xl text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-black mb-3">
                    Message Sent Successfully!
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Thank you for contacting us. We'll get back to you shortly.
                  </p>
                  <button
                    onClick={() => setIsSubmitted(false)}
                    className="px-6 py-3 bg-black text-white rounded-full font-medium hover:bg-gray-900 transition-colors"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <FiUser className="text-gray-400" /> Full Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-black focus:ring-2 focus:ring-black/10 focus:outline-none transition-all duration-300 bg-white"
                        placeholder="John Doe"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-black focus:ring-2 focus:ring-black/10 focus:outline-none transition-all duration-300 bg-white"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-black focus:ring-2 focus:ring-black/10 focus:outline-none transition-all duration-300 bg-white"
                        placeholder="+1 (123) 456-7890"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Subject *
                      </label>
                      <select
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-black focus:ring-2 focus:ring-black/10 focus:outline-none transition-all duration-300 bg-white"
                      >
                        <option value="">Select a subject</option>
                        <option value="support">Technical Support</option>
                        <option value="sales">Sales Inquiry</option>
                        <option value="billing">Billing Question</option>
                        <option value="partnership">Partnership</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Your Message *
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={6}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-black focus:ring-2 focus:ring-black/10 focus:outline-none transition-all duration-300 bg-white resize-none"
                      placeholder="Tell us how we can help you..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 bg-linear-to-r from-black to-gray-900 text-white font-semibold rounded-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <FiSend className="text-xl" />
                        Send Message
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Right Column - Contact Info & Map */}
          <div className="space-y-8">
            {/* Map */}
            <div className="bg-linear-to-br from-gray-50 to-white rounded-2xl p-6 border border-gray-200">
              <h3 className="text-xl font-bold text-black mb-6">
                Find Our Store
              </h3>
              <div className="rounded-xl overflow-hidden border border-gray-300 shadow-lg">
                <iframe
                  title="Our Location"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3153.681434336341!2d-122.419416484682!3d37.774929779759!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8085808c2a9f6c9f%3A0x5d1b5b5b5b5b5b5b!2sSan%20Francisco%2C%20CA!5e0!3m2!1sen!2sus!4v1619471234567!5m2!1sen!2sus"
                  width="100%"
                  height="300"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="rounded-xl"
                ></iframe>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
