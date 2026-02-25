import React, { useState } from "react";
import { FiChevronDown } from "react-icons/fi";
import { FaEnvelope, FaPhone } from "react-icons/fa";

const faqItems = [
  {
    id: 1,
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit cards (Visa, MasterCard, American Express, Discover), PayPal, Apple Pay, and Google Pay. All transactions are encrypted and secure.",
    category: "Payment",
  },
  {
    id: 2,
    question: "How long does shipping take?",
    answer:
      "Standard shipping takes 3-5 business days. Express shipping is available for 1-2 business days. International shipping typically takes 7-14 business days depending on the destination.",
    category: "Shipping",
  },

  {
    id: 3,
    question: "How do I contact customer support?",
    answer:
      "You can reach our support team 24/7 via live chat, email at support@ecommerce.com, or phone at +1-800-123-4567. Average response time is under 5 minutes for live chat.",
    category: "Support",
  },
];

const FAQ = () => {
  const [openId, setOpenId] = useState(faqItems[0].id);
  const [activeCategory, setActiveCategory] = useState("All");

  const categories = ["All", "Payment", "Shipping", "Support"];

  const toggle = (id) => {
    setOpenId((current) => (current === id ? null : id));
  };

  const filteredFaqs = faqItems.filter((item) => {
    return activeCategory === "All" || item.category === activeCategory;
  });

  return (
    <section className="min-h-screen bg-white py-8 md:py-12 lg:py-16">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 md:mb-12 lg:mb-16">
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-black mb-4 tracking-tight">
            How Can We Help?
          </h1>
          <p className="text-gray-600 text-base md:text-lg max-w-2xl mx-auto mb-8">
            Find answers to common questions about shopping, shipping, returns,
            and more.
          </p>
        </div>

        {/* Contact Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8 md:mb-12">
          {[
            {
              icon: <FaEnvelope className="text-2xl" />,
              title: "Email Support",
              description: "Get help via email",
              contact: "support@ecommerce.com",
              action: "mailto:support@ecommerce.com",
              bg: "bg-gradient-to-br from-gray-50 to-gray-100",
            },
            {
              icon: <FaPhone className="text-2xl" />,
              title: "Call Us",
              description: "Speak with our team",
              contact: "+1-800-123-4567",
              action: "tel:+18001234567",
              bg: "bg-gradient-to-br from-black to-gray-900",
              featured: true,
            },
          ].map((card, index) => (
            <a
              key={index}
              href={card.action}
              className={`${card.bg} rounded-2xl p-6 md:p-8 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl border border-gray-200 ${
                card.featured ? "text-white" : "text-black"
              }`}
            >
              <div className="flex items-start justify-between mb-6">
                <div
                  className={`p-3 rounded-xl ${card.featured ? "bg-white/10" : "bg-black/5"}`}
                >
                  {card.icon}
                </div>
                <span
                  className={`text-xs font-semibold px-3 py-1 rounded-full ${card.featured ? "bg-white/20" : "bg-black/10"}`}
                >
                  {card.contact}
                </span>
              </div>
              <h3 className="text-xl font-bold mb-2">{card.title}</h3>
              <p
                className={`text-sm ${card.featured ? "text-gray-300" : "text-gray-600"}`}
              >
                {card.description}
              </p>
            </a>
          ))}
        </div>

        {/* Category Filter */}
        <div className="mb-8 md:mb-12">
          <div className="flex flex-wrap gap-2 md:gap-3 justify-center">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-4 md:px-6 py-2 md:py-3 rounded-full text-sm font-medium transition-all duration-300 ${
                  activeCategory === category
                    ? "bg-black text-white shadow-lg"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-black mb-2">
            Frequently Asked Questions
          </h2>
          <p className="text-gray-600">
            {filteredFaqs.length}{" "}
            {filteredFaqs.length === 1 ? "question" : "questions"} found
          </p>
        </div>

        <div className="space-y-4">
          {filteredFaqs.map((item) => {
            const isOpen = item.id === openId;
            return (
              <div
                key={item.id}
                className={`border border-gray-200 rounded-2xl overflow-hidden transition-all duration-300 ${
                  isOpen ? "shadow-xl" : "hover:shadow-lg"
                }`}
              >
                <button
                  onClick={() => toggle(item.id)}
                  className="w-full text-left p-6 md:p-8 bg-white hover:bg-gray-50 transition-colors duration-300 flex items-start justify-between gap-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-semibold px-3 py-1 bg-gray-100 text-gray-700 rounded-full">
                        {item.category}
                      </span>
                    </div>
                    <h3 className="text-lg md:text-xl font-semibold text-black pr-8">
                      {item.question}
                    </h3>
                    {isOpen && (
                      <p className="mt-4 text-gray-600 line-clamp-2">
                        {item.answer}
                      </p>
                    )}
                  </div>
                  <div
                    className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isOpen ? "bg-black rotate-180" : "bg-gray-100"
                    }`}
                  >
                    <FiChevronDown
                      className={`text-lg transition-transform duration-300 ${
                        isOpen ? "text-white" : "text-gray-600"
                      }`}
                    />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-6 md:px-8 pb-6 md:pb-8 bg-linear-to-b from-gray-50 to-white">
                    <div className="pl-6 border-l-2 border-black">
                      <p className="text-gray-700 leading-relaxed">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
