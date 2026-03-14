import { useState } from "react";
import AnimatedSection from "./AnimatedSection";
import { toast } from "sonner";

const ContactSection = () => {
  const [form, setForm] = useState({
    name: "", email: "", whatsapp: "", level: "", goals: "", message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
      const formData = new FormData(e.target as HTMLFormElement);
      await fetch("/", {
        method: "POST",
        headers: {"Content-Type": "application/x-www-form-urlencoded "},
        body: new URLSearchParams(formData as any).toString(),
      });
    toast.success("Thank you! I'll be in touch within 24 hours.");
    setForm({ name: "", email: "", whatsapp: "", level: "", goals: "", message: "" });
  };

  const inputClass =
    "w-full px-4 py-3 bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-navy transition-colors font-sans text-sm";

  return (
    <section id="contact" className="section-padding bg-secondary">
      <div className="container-editorial">
        <div className="grid md:grid-cols-2 gap-16 lg:gap-24">
          <AnimatedSection>
            <p className="text-label text-muted-foreground mb-4">Get in Touch</p>
            <h2 className="text-editorial-lg text-foreground mb-8">
              Start your journey.
            </h2>
            <div className="space-y-6 text-muted-foreground">
              <p className="text-body-lg">
                Based in Cairo, teaching students online worldwide. Send a message to book your trial lesson or ask any questions.
              </p>
              <div className="space-y-3 text-sm">
                <p>
                  <span className="text-label text-foreground block mb-1">WhatsApp</span>
                  <a href="https://wa.me/15713265041" className="hover:text-foreground transition-colors">+1 (571) 326-5041</a>
                </p>
                <p>
                  <span className="text-label text-foreground block mb-1">Egypt</span>
                  <a href="tel:+201500743304" className="hover:text-foreground transition-colors">+20 150 074 3304</a>
                </p>
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.2}>
            <form onSubmit={handleSubmit} 
                className="space-y-5"
                name="contact"
                method="POST"
                data-netlify="true"
            >
                <input type="hidden" name="form-name" value="contact" />

              <input
                name="name"
                type="text"
                placeholder="Name"
                required
                maxLength={100}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputClass}
              />
              <input
                name="email"
                type="email"
                placeholder="Email"
                required
                maxLength={255}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputClass}
              />
              <input
                name="whatsapp"
                type="tel"
                placeholder="WhatsApp Number"
                maxLength={20}
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                className={inputClass}
              />
              <select
                name="level"
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value })}
                className={inputClass}
              >
                <option value="">Current English Level</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="upper-intermediate">Upper Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
              <input
                name="goals"
                type="text"
                placeholder="Your Goals (e.g., interview prep, business English)"
                maxLength={200}
                value={form.goals}
                onChange={(e) => setForm({ ...form, goals: e.target.value })}
                className={inputClass}
              />
              <textarea
                name="message"
                placeholder="Message"
                rows={4}
                maxLength={1000}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className={inputClass + " resize-none"}
              />
              <button
                type="submit"
                className="text-label w-full px-8 py-4 bg-foreground text-background hover:bg-navy transition-colors"
              >
                Send Message
              </button>
            </form>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
