import { useEffect } from "react";
import { Link } from "react-router-dom";

const NotFound = () => {
  useEffect(() => {
    document.title = "Page not found | FluentBridges";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  return (
    <main className="flex min-h-screen items-center bg-background">
      <div className="container-editorial py-24">
        <p className="text-label text-muted-foreground mb-4">404</p>
        <h1 className="text-editorial-lg text-foreground mb-6">This page doesn't exist.</h1>
        <p className="text-body-lg text-muted-foreground max-w-xl mb-10">The link may be old or mistyped.</p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link to="/" className="text-label text-center px-8 py-4 bg-foreground text-background hover:bg-navy transition-colors">
            Go to the homepage
          </Link>
          <Link
            to="/enroll"
            className="text-label text-center px-8 py-4 border border-foreground text-foreground hover:bg-foreground hover:text-background transition-colors"
          >
            Take the free level test
          </Link>
        </div>
      </div>
    </main>
  );
};

export default NotFound;
