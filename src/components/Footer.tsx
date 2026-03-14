const navLinks = [
  { label: "Home", href: "#hero" },
  { label: "Lessons", href: "#services" },
  { label: "About", href: "#about" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact", href: "#contact" },
];

const Footer = () => (
  <footer className="py-16 bg-primary text-primary-foreground">
    <div className="container-editorial">
      <div className="grid md:grid-cols-3 gap-12 mb-16">
        <div>
          <h3 className="font-serif text-2xl mb-4">FluentBridges</h3>
          <p className="text-sm text-primary-foreground/60 leading-relaxed max-w-xs">
            Helping adults and professionals bridge the gap between studying English and speaking it confidently.
          </p>
        </div>
        <div>
          <p className="text-label text-primary-foreground/40 mb-4">Navigation</p>
          <div className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-primary-foreground/60 hover:text-primary-foreground transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
        <div>
          <p className="text-label text-primary-foreground/40 mb-4">Contact</p>
          <div className="space-y-3 text-sm text-primary-foreground/60">
            <p>
              <a href="https://wa.me/15713265041" className="hover:text-primary-foreground transition-colors">
                WhatsApp: +1 (571) 326-5041
              </a>
            </p>
            <p>
              <a href="tel:+201500743304" className="hover:text-primary-foreground transition-colors">
                Egypt: +20 150 074 3304
              </a>
            </p>
          </div>
        </div>
      </div>
      <div className="border-t border-primary-foreground/10 pt-8 text-center">
        <p className="text-xs text-primary-foreground/40">
          © {new Date().getFullYear()} FluentBridges. All rights reserved.
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
