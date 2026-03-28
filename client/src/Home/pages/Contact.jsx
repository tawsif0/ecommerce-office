import React, { useMemo, useState } from "react";
import axios from "axios";
import {
  FiCheckCircle,
  FiMail,
  FiMapPin,
  FiMessageSquare,
  FiPhone,
  FiSend,
  FiUser,
} from "react-icons/fi";
import { toast } from "react-hot-toast";
import usePublicSettings from "../../hooks/usePublicSettings";

const baseUrl = import.meta.env.VITE_API_URL;

const subjectOptions = [
  { value: "support", label: "Technical Support" },
  { value: "sales", label: "Sales Inquiry" },
  { value: "billing", label: "Billing Question" },
  { value: "partnership", label: "Partnership" },
  { value: "other", label: "Other" },
];

const withProtocol = (value) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("tel:")
  ) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

const getMapEmbedUrl = (address, addressLink) => {
  const normalizedLink = withProtocol(addressLink);
  if (normalizedLink.includes("output=embed")) return normalizedLink;

  const normalizedAddress = String(address || "").trim() || "Dhaka Bangladesh";
  return `https://maps.google.com/maps?q=${encodeURIComponent(
    normalizedAddress,
  )}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
};

const Contact = () => {
  const { settings } = usePublicSettings();
  const website = settings?.website || {};
  const contact = settings?.contact || {};
  const storeName = String(website?.storeName || "E-Commerce").trim() || "E-Commerce";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const contactInfo = useMemo(
    () => ({
      email: String(contact?.email || "support@marketplace.com.bd").trim(),
      phone1: String(contact?.phone1 || "+880 1700-000000").trim(),
      phone2: String(contact?.phone2 || "").trim(),
      address:
        String(contact?.address || "").trim() ||
        "Shop 12, Level 3, Bashundhara City, Panthapath, Dhaka 1215, Bangladesh",
      addressLink:
        withProtocol(contact?.addressLink) ||
        `https://maps.google.com/?q=${encodeURIComponent(
          String(contact?.address || "Dhaka Bangladesh").trim(),
        )}`,
      mapUrl: getMapEmbedUrl(contact?.address, contact?.addressLink),
    }),
    [contact],
  );

  const infoCards = [
    {
      icon: <FiMail className="text-xl" />,
      title: "Email Support",
      value: contactInfo.email,
      href: `mailto:${contactInfo.email}`,
    },
    {
      icon: <FiPhone className="text-xl" />,
      title: "Call Us",
      value: contactInfo.phone1,
      href: `tel:${contactInfo.phone1.replace(/\s+/g, "")}`,
    },
    {
      icon: <FiMapPin className="text-xl" />,
      title: "Visit Us",
      value: contactInfo.address,
      href: contactInfo.addressLink,
    },
  ];

  const handleChange = (event) => {
    setFormData((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      ...formData,
      name: String(formData.name || "").trim(),
      email: String(formData.email || "").trim(),
      phone: String(formData.phone || "").trim(),
      subject:
        subjectOptions.find((option) => option.value === formData.subject)?.label ||
        "Other",
      message: String(formData.message || "").trim(),
    };

    if (!payload.name || !payload.email || !payload.subject || !payload.message) {
      toast.error("Name, email, subject, and message are required");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await axios.post(`${baseUrl}/contact-submissions`, payload);

      if (!response.data?.success) {
        toast.error("Failed to send your message");
        return;
      }

      toast.success("Your message has been sent");
      setIsSubmitted(true);
      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
      });
      window.setTimeout(() => setIsSubmitted(false), 5000);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send your message");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="min-h-screen bg-white">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-white opacity-5" />
        <div className="site-container relative py-12 md:py-15">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mb-4 text-3xl font-bold tracking-tight text-black md:text-4xl lg:text-5xl">
              Get In{" "}
              <span className="bg-linear-to-r from-gray-800 to-black bg-clip-text text-transparent">
                Touch
              </span>
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-base text-gray-600 md:text-lg">
              Send your question directly to the {storeName} team. Every form
              submission appears in the admin contacted-users list right away,
              just like the reference ecommerce site.
            </p>
          </div>
        </div>
      </div>

      <div className="site-container pb-16">
        <div className="mb-12 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12 md:mb-20">
          <div className="space-y-8">
            <div className="rounded-3xl border border-gray-200 bg-linear-to-br from-white to-gray-50 p-6 shadow-xl md:p-8">
              <div className="mb-8 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black">
                  <FiMessageSquare className="text-xl text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-black">Send us a message</h2>
                  <p className="text-gray-600">
                    Your message appears in the admin contacted list right away.
                  </p>
                </div>
              </div>

              {isSubmitted ? (
                <div className="py-12 text-center">
                  <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                    <FiCheckCircle className="text-4xl text-green-600" />
                  </div>
                  <h3 className="mb-3 text-2xl font-bold text-black">
                    Message Sent Successfully
                  </h3>
                  <p className="mb-6 text-gray-600">
                    Thank you for contacting us. The admin team has already
                    received your message.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsSubmitted(false)}
                    className="rounded-full bg-black px-6 py-3 font-medium text-white transition-colors hover:bg-gray-900"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <FiUser className="text-gray-400" /> Full Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 transition-all duration-300 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
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
                        className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 transition-all duration-300 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 transition-all duration-300 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                        placeholder={contactInfo.phone1}
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
                        className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 transition-all duration-300 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                      >
                        <option value="">Select a subject</option>
                        {subjectOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
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
                      rows={7}
                      className="w-full resize-none rounded-xl border-2 border-gray-200 bg-white px-4 py-3 transition-all duration-300 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                      placeholder="Tell us how we can help you..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex w-full items-center justify-center gap-3 rounded-xl bg-linear-to-r from-black to-gray-900 py-4 font-semibold text-white transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
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

          <div className="space-y-8">
            <div className="grid grid-cols-1 gap-4">
              {infoCards.map((card) => (
                <a
                  key={card.title}
                  href={card.href}
                  target={card.title === "Visit Us" ? "_blank" : undefined}
                  rel={card.title === "Visit Us" ? "noopener noreferrer" : undefined}
                  className="rounded-2xl border border-gray-200 bg-linear-to-br from-white to-gray-50 p-5 shadow-sm transition hover:shadow-lg"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-white">
                      {card.icon}
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">
                        {card.title}
                      </p>
                      <p className="mt-2 break-all text-sm font-medium text-black">
                        {card.value}
                      </p>
                    </div>
                  </div>
                </a>
              ))}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-linear-to-br from-gray-50 to-white p-6">
              <h3 className="mb-6 text-xl font-bold text-black">Find Our Store</h3>
              <div className="overflow-hidden rounded-xl border border-gray-300 shadow-lg">
                <iframe
                  title={`${storeName} location`}
                  src={contactInfo.mapUrl}
                  width="100%"
                  height="320"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="rounded-xl"
                />
              </div>
              {contactInfo.phone2 ? (
                <p className="mt-4 text-sm text-gray-600">
                  Alternate support line: <span className="font-medium text-black">{contactInfo.phone2}</span>
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
