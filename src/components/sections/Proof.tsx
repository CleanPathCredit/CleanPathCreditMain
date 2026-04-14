import React from "react";
import { motion } from "motion/react";
import { HoverCard } from "@/components/ui/HoverCard";
import { Star } from "lucide-react";

export function Proof() {
  const testimonials = [
    {
      name: "Sarah M.",
      title: "First-Time Homebuyer — Dallas, TX",
      quote: "I was one missed payment away from losing my shot at a house. My specialist removed 4 collections in under 60 days. I closed on my home last month. I genuinely cried.",
      rating: 5,
    },
    {
      name: "Marcus T.",
      title: "Restaurant Owner — Chicago, IL",
      quote: "My advisor found reporting errors I'd had for 8 years. Eight years. Gone in 5 weeks. I secured a $50k business line of credit the month after. This service pays for itself.",
      rating: 5,
    },
    {
      name: "Aisha R.",
      title: "Registered Nurse — Atlanta, GA",
      quote: "I paid off a medical collection thinking it would help my score. It didn't move at all. Clean Path explained why — then disputed it off completely. Up 67 points in 45 days.",
      rating: 5,
    },
    {
      name: "Kevin L.",
      title: "Small Business Owner — Phoenix, AZ",
      quote: "I was getting 23% interest rates on auto loans. After 90 days with Clean Path, I refinanced at 6.9%. That's over $4,000 back in my pocket. Wish I'd done this years ago.",
      rating: 4.9,
    },
    {
      name: "Vanessa B.",
      title: "Marketing Manager — Houston, TX",
      quote: "I tried two other credit repair companies. Both sent the same generic letters month after month. Clean Path actually looked at my reports, told me exactly what to fight and why. Night and day.",
      rating: 5,
    },
    {
      name: "James H.",
      title: "Real Estate Investor — Miami, FL",
      quote: "My advisor knew the FCRA inside and out. She challenged items I thought were permanent and got three of them deleted. I now refer every client who needs credit work to Clean Path.",
      rating: 4.8,
    },
  ];

  return (
    <section className="relative py-32 px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-20 text-center">
          <h2 className="mb-4 font-display text-3xl font-semibold tracking-tight text-zinc-900 md:text-5xl">
            Real people. Real results.
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-zinc-600">
            Our clients don't just see better scores — they get approved for homes, cars, and funding they were denied for before. See what's possible when you stop hoping and start fighting.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <HoverCard className="h-full p-8 flex flex-col">
                <div className="mb-6 flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      whileHover={{ scale: 1.2, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      <Star
                        className={`h-4 w-4 ${
                          i < Math.floor(testimonial.rating)
                            ? "fill-emerald-500 text-emerald-500"
                            : "fill-zinc-200 text-zinc-200"
                        }`}
                      />
                    </motion.div>
                  ))}
                  <span className="ml-2 text-sm font-medium text-zinc-900">
                    {testimonial.rating}
                  </span>
                </div>
                <blockquote className="mb-8 flex-1 text-lg text-zinc-700 leading-relaxed">
                  "{testimonial.quote}"
                </blockquote>
                <div>
                  <div className="font-semibold text-zinc-900">{testimonial.name}</div>
                  <div className="text-sm text-zinc-500">{testimonial.title}</div>
                </div>
              </HoverCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
