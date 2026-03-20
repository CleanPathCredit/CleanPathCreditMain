import React from "react";
import { motion } from "motion/react";
import { HoverCard } from "@/components/ui/HoverCard";
import { Star } from "lucide-react";

export function Proof() {
  const testimonials = [
    {
      name: "Sarah Jenkins",
      title: "Software Engineer",
      quote: "The AI analysis found errors I didn't even know existed. My score jumped 80 points in 45 days. The dashboard is incredibly clean and intuitive.",
      rating: 5,
    },
    {
      name: "Michael Chen",
      title: "Small Business Owner",
      quote: "I needed a fast solution to secure a business loan. Clean Path Credit handled the disputes automatically. It felt like having a developer team working on my credit.",
      rating: 5,
    },
    {
      name: "Elena Rodriguez",
      title: "Product Designer",
      quote: "Finally, a credit repair service that doesn't feel like a scam. The UI is gorgeous, the process is transparent, and the results are real.",
      rating: 5,
    },
    {
      name: "David Thompson",
      title: "Freelance Consultant",
      quote: "The automated dispute generation is magic. I watched my negative items disappear one by one. Highly recommended for anyone who values efficiency.",
      rating: 4.9,
    },
    {
      name: "Jessica Lee",
      title: "Marketing Director",
      quote: "I was skeptical about AI credit repair, but the results speak for themselves. The platform is seamless and the customer support is top-notch.",
      rating: 5,
    },
    {
      name: "Marcus Johnson",
      title: "Real Estate Agent",
      quote: "I refer all my clients with credit issues to Clean Path. It's the most reliable, modern, and effective service I've seen in the industry.",
      rating: 4.8,
    },
  ];

  return (
    <section className="relative py-32 px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-20 text-center">
          <h2 className="mb-4 font-display text-3xl font-semibold tracking-tight text-zinc-900 md:text-5xl">
            Trusted by professionals.
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-zinc-600">
            Our mission is to drive progress and enhance the financial lives of our customers by delivering superior products and services that exceed expectations.
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
